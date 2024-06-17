//jshint esversion:6
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
// const md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;

// const encrypt= require('mongoose-encryption');

const app = express();
app.set("view engine",'ejs');
app.use(bodyParser.urlencoded({
  extended : true
}));
app.use(express.static("public"));

app.use(session({
  secret : "my secret is not strong",
  resave : false,
  saveUninitialized : false
}));

app.use(passport.initialize());
app.use(passport.session());


// mongoose.connect("mongodb://127.0.0.1:27017/userDB",{useNewUrlParser : true});
mongoose.connect(process.env.CONNECTION_STRING, {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
  email : String,
  password : String,
  googleId: String,
  secret : String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// userSchema.plugin(encrypt,{secret : process.env.SECRET,encryptedFields :["password"]});
const User = new mongoose.model("User",userSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user,done){
  done(null,user.id);
});
passport.deserializeUser(function(id,done){
  User.findById(id,function(err,user){
    done(err,user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://secrets-app-h2di.onrender.com/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile.id);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
app.get("/",function(req,res){
  res.render("home");
});
// app.get("/auth/google",function(req,res){
//   console.log("got req");
//   passport.authenticate("google",{scope: ["profile"]});
// });
app.get("/login",function(req,res){
  res.render("login");
});
app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }
  else{
    res.redirect("/login");
}});
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

  app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/secrets');
    });
app.get("/register",function(req,res){
  res.render("register");
});
app.get("/secrets",function(req,res){
  // if(req.isAuthenticated()){
  //   res.render("secrets");
  // }
  // else{
  //   res.redirect("/login");
  // }
  //above code is to auth and show
  //down code is for directly show all secrets
  User.find({"secret":{$ne: null}}, function(err,foundUsers){
    if(err){
      console.log(err);
    }else {
      if(foundUsers){
        console.log(foundUsers);
        res.render("secrets",{userWithSecrets : foundUsers});
      }
    }
  });
});

app.get("/logout",function(req,res){
  req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect("/");
    });
});

app.post("/register",function(req,res){
  User.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
      res.render("user_exist");
      // console.log(err);
      // res.redirect("/register");
    }
    else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
      });
    }
  });







  // bcrypt.hash(req.body.password,saltRounds,function(err,hash){
  //   const newUser = new User({
  //     email : req.body.username,
  //     password: hash
  //   });
  //   newUser.save(function(err){
  //     if(err){
  //       console.log(err);
  //     }
  //     else{
  //       res.render("secrets");
  //     }
  //   });
  //
  // });

});
app.post("/submit",function(req,res){
  const submittedSecret = req.body.secret;
  User.findById(req.user.id,function(err,foundUser){
    if(err){
      console.log(err);
    }
    else{
    if(foundUser){
      foundUser.secret = submittedSecret;
      foundUser.save(function(){
        res.redirect("/secrets");
      });

    }
    }
  });

});
app.post("/login",function(req,res){
  const user = new User({
    username:req.body.username,
    password:req.body.passport
  });

  req.login(user,function(err){  //login function from passport
     if(err){
       console.log(err);

     }else{
       passport.authenticate('local')(req,res,function(){
         res.redirect('/secrets');
       });
     }
  });
  // const username = req.body.username;
  // const password = req.body.password;
  //
  // User.findOne({email : username},function(err,foundUser){
  //     if(foundUser){
  //       bcrypt.compare(req.body.password,foundUser.password,function(err,result){
  //         if(result === true){
  //           res.render("secrets");
  //         }
  //         else{
  //           console.log(foundUser);
  //           res.send("Wrong password");
  //
  //         }
  //       });
  //
  //     }
  //     else{
  //       res.send("User not registered");
  //       console.log(err);
  //     }
  //
  // });
});

app.listen(3600,function(){
  console.log("Server is running on localhost 3600");
})
