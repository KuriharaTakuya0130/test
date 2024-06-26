
module.exports={
  PORT:  process.env.PORT || 3000,
  security:{
    SESSION_SECRET: "YOUR-SESSION-SECRET-STRING",
    ACCOUNT_LOCK_WINDOW: 30,
    ACCOUNT_LOCK_THRESHOLD: 2,
    ACCOUNT_LOCK_TIME: 60,
    MAX_LOGIN_HISTORY: 3

  },
  search:{
    MAX_ITEMS_PER_PAGE: 5
  }
};