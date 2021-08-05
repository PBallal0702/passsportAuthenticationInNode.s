//jshint esversion:6
require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption")
// const md5 = require("md5")
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require('express-session')
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({
  secret:"this is my secret",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/secretsDB",{useNewUrlParser:true});

mongoose.set('useCreateIndex', true);

const secretSchema = new mongoose.Schema({
  username:String,
  password:String,
  googleId:String,
  secret:String
});

secretSchema.plugin(passportLocalMongoose);
secretSchema.plugin(findOrCreate);


const User = new mongoose.model("User",secretSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id, username: profile.id  }, function (err, user) {
      return cb(err, user);
    });
  }
));


// const secret = "Thisismysecret";
// secretSchema.plugin(encrypt,{secret:process.env.SECRET ,encryptedFields:["password"]});



app.get("/",function(req,res){
  res.render("home");
});

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});

// app.post("/register",function(req,res){
//   const email = req.body.username;
//   const password = req.body.password
//   bcrypt.hash(password, saltRounds, function(err, hash) {
//     // Store hash in your password DB.
//     const User = new Secterdetail({
//       emal:email,
//       password:hash
//     });
//     User.save(function(err){
//       if(err){
//         console.log(err);
//       }
//       else{
//         res.render("login");
//       }
//     });
// });
// });
app.get("/secrets",function(req,res){
  if(req.isAuthenticated){
    res.render("secrets");
  }
  else{
    res.render("login");
  }
});

app.get("/submit",function(req,res){
  if(req.isAuthenticated){
    res.render("submit");
  }
  else{
    res.render("login");
  }
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

  app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.post("/register",function(req,res){
  User.register({username: req.body.username},req.body.password,function(err,user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets")
      });
    }
  });

});


// app.post("/login",function(req,res){
//   const inptEmai = req.body.username;
//   const inptPass = req.body.password;
//   Secterdetail.findOne({emal:inptEmai},function(err,doc){
//     if(err){
//       console.log("Something went wrong "+err);
//     }else{
//         if(doc){
//           bcrypt.compare(inptPass, doc.password, function(err, result) {
//           if(result){
//             res.render("secrets")
//           }
//           else{
//             res.send("Enter correct password");
//           }
//     });
//         }
//         else{
//           res.send("you are not regester");
//         }
//     }
//   })
// });

app.post("/login",function(req,res){
      const user = new User({
        username:req.body.username,
        password:req.body.password
      });
      req.login(user,function(err){
        if(err){
          console.log(err);
        }
        else{
          passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets")
          });
        }
      });

});

app.post("/submit",function(req,res){
  submmitedSecret = req.body.secret;
  User.findById(req.user.id,function(err,findone){
    if(err){
      console.log(err);
    }
    else{
      if(findone){
        findone.secret =submmitedSecret;
        findone.save(function(){
          res.redirect("/secrets")
        });
      }
    }
  })
});


app.listen(3000,function(){
  console.log("working on local host 3000");
});
