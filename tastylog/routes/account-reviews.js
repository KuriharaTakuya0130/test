const router=require("express").Router();
const {MySQLClient,sql}=require("../lib/database/client.js");
const moment=require("moment");
const tokens=new (require("csrf"))();

const DATE_FORMAT="YYYY/MM/DD";

var validateReviewData=function(req){
  var body=req.body;
  var isValid=true,error={};

  if (body.visit && !moment(body.visit,DATE_FORMAT).isValid()){
    isValid=false;
    error.visit="訪問日の日付文字列が不正です。";
  }
  if (isValid){
    return undefined;
  }
  return error;
};

var createReviewData=function(req){
  var body=req.body,date;
  
  return {
    shopID:req.params.shopID,
    score: parseFloat(body.score),
    visit: (date=moment(body.visit,DATE_FORMAT)) && date.isValid() ? date.toDate() :null,
    post: new Date(),
    description: body.description
  };
};

router.get("/regist/:shopID(\\d+)",async(req,res,next)=>{
  var shopID=req.params.shopID;
  var shop,shopName,review,results,secret,token;

  secret=await tokens.secret();
  token=tokens.create(secret);
  req.session._csrf=secret;
  res.cookie("_csrf",token);

  try{
    results=await MySQLClient.executeQuery(
      await sql("SELECT_SHOP_BASIC_BY_ID"),
      [shopID]
    );
    shop=results[0] || {};
    shopName=shop.name;
    review={};
    res.render("./account/reviews/regist-form.ejs",{shopID,shopName,review});
  }catch(err){
    next(err);
  }
});

router.post("/regist/:shopID(\\d+)",(req,res,next)=>{
  var review=createReviewData(req);
  var {shopID,shopName}=req.body;
  res.render("./account/reviews/regist-form.ejs",{shopID,shopName,review});

});
router.post("/regist/confirm",(req,res,next)=>{
  var error=validateReviewData(req);
  var review=createReviewData(req);
  var {shopID,shopName}=req.body;

  if (error){
    res.render("./account/reviews/regist-form.ejs", {error,shopID,shopName,review});
    return;
  }

  res.render("./account/reviews/regist-confirm.ejs",{shopID,shopName,review});
});


router.post("/regist/execute",async (req,res,next)=>{
  var secret=req.session._csrf;
  var token=req.cookies._csrf;

  if (tokens.verify(secret,token)===false){
    next(new Error("Invalid Token."));
    return;
  }


  var error=validateReviewData(req);
  var review=createReviewData(req);
  var {shopID,shopName}=req.body;
  var userId=1;
  var transaction;

  if (error){
    res.render("./account/reviews/regist-form.ejs", {error,shopID,shopName,review});
    return;
  }

  try{
    
    transaction=await MySQLClient.beginTransaction();
    transaction.executeQuery(
      await sql("SELECT_SHOP_BY_ID_FOR_UPADATE"),
      [shopID]
    );
    transaction.executeQuery(
      await sql("INSERT_SHOP_REVIEW"),
      [shopID,userId,review.score,review.visit,review.description]
    );
    transaction.executeQuery(
      await sql("UPDATE_SHOP_SCORE_BY_ID"),
      [shopID,shopID]
    );
    await transaction.commit();
  }catch(err){
    await transaction.rollback();
    next(err);
    return;
  }
  
  delete req.session._csrf;
  res.clearCookie("_csrf");

  res.redirect(`/account/reviews/regist/complete?shopID=${shopID}`);
});

router.get("/regist/complete",(req,res,next)=>{
  res.render("./account/reviews/regist-complete.ejs",{shopID: req.query.shopID});
});

module.exports=router;