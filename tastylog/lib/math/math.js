const roundto=require("round-to");

var padding=function(value){
  if(isNaN(parseFloat(value))){
    return "-";
  }

  return roundto(value,2).toPrecision(3);
};

var round=function(value){
  return roundto(value,2);
};

module.exports={
  padding,
  round
};