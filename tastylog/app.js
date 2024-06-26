const IS_PRODUCTION=process.env.NODE_ENV === "production";
const appconfig=require("./config/application.config.js");
const dbconfig=require("./config/mysql.config.js");
const path = require("path");
const logger=require("./lib/log/logger.js");
const applicationlogger=require("./lib/log/applicationlogger.js");
const accesslogger=require("./lib/log/accesslogger.js");
const accesscontrol=require("./lib/security/accesscontrol.js");
const express = require("express");
const favicon = require("serve-favicon");
const cookie=require("cookie-parser");
const session =require("express-session");
const MySQLStore=require("express-mysql-session")(session);
const gracefulShutdown=require("http-graceful-shutdown");
const falsh=require("connect-flash");
const app = express();

// Express settings
app.set("view engine", "ejs");
app.disable("x-powered-by");

app.use((req,res,next)=>{
  res.locals.moment=require("moment");
  res.locals.padding=require("./lib/math/math.js").padding;
  next();
});

// Static resource rooting.
app.use(favicon(path.join(__dirname, "/public/favicon.ico")));
app.use("/public", express.static(path.join(__dirname, "/public")));
app.use(accesslogger());

app.use(cookie());
app.use(session({
  store: new MySQLStore({
    host: dbconfig.HOST,
    port: dbconfig.PORT,
    user: dbconfig.USERNAME,
    password: dbconfig.PASSWORD,
    database: dbconfig.DATABASE
  }),
  cookie: {
    secure: IS_PRODUCTION
  },
  secret: appconfig.security.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: "sid"
}));
app.use(express.urlencoded({extended: true}));
app.use(falsh());
app.use(...accesscontrol.initialize());

// Dynamic resource rooting.
app.use("/",(()=>{
  const router=express.Router();
  router.use((req,res,next)=>{
    res.setHeader("X-Frame-options","SAMEORIGIN");
    next();
  });
  router.use("/", require("./routes/index.js"));
  router.use("/account",require("./routes/account.js"));
  router.use("/search",require("./routes/search.js"));
  router.use("/test",(req,res)=>{throw new Error("test error");});
  router.use("/shops",require("./routes/shops.js"));

  return router;
})());

app.use(applicationlogger());

app.use((req,res,next)=>{
  res.status(404);
  res.render("./404.ejs");
});

app.use((err,req,res,next)=>{
  res.status(500);
  res.render("./500.ejs");
});

// Execute web application.
var server=app.listen(appconfig.PORT, () => {
  logger.application.info(`Application listening at :${appconfig.PORT}`);
});
gracefulShutdown(server,{
  signals: "SIGINT SIGTERM",
  timeout: 10000,
  onShutdown: ()=>{
    return new Promise((resolve,reject)=>{
      const {pool}=require("./lib/database/pool.js");
      pool.end((err)=>{
        if(err){
          return reject(err);
        }
        resolve();
      });
    });
  },
  finally: ()=>{
    const logger=require("./lib/log/logger.js").application;
    logger.info("Application shutdown finished.");
  }
});