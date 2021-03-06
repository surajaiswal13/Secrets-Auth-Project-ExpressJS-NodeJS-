require("dotenv").config();
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
// const encrypt = require('mongoose-encryption');
// const md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate")

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Database

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// console.log(process.env.SECRET);

// const secret = process.env.SECRET
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// Serialization & Deserialization for all Strategies

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// Paste this code below every setting and above routes
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    // Google + depriciation solution
    // userProfileUrl: "http://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

// Home

app.get("/", (req, res) => {
  res.render("home")
});

// OAuth Authentication
// It brings up a popup to authenticate

app.get("/auth/google",
  passport.authenticate("google", {scope: ["profile"]})
);

// After Authentication

app.get("/auth/google/secrets",
  passport.authenticate("google", {failureRedirect: "/login"}),
  (req, res) => {
    res.redirect("/secrets");
  }
)

// Register

app.route("/register")

.get((req, res) => {
  res.render("register")
})

.post((req, res) => {

  User.register({username: req.body.username}, req.body.password, (err, user) => {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      // Run if registration is successful and setting of cookie is successful
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      })
    }
  })
});

// Secrets

app.get("/secrets", (req, res) => {
  // if (req.isAuthenticated()) {
  //   res.render("secrets");
  // } else {
  //   res.redirect("/login")
  // }
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if(err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", {usersWithSecret: foundUsers});
      }
    }
  });
});

// Submit

app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res) {
  const submittedSecret = req.body.secret;

  console.log(req.body.id);

  User.findById(req.user.id, function(err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function() {
          res.redirect("/secrets");
        });
      }
    }
  });
});

// login

app.route("/login")

.get((req, res) => {
  res.render("login")
})

.post((req, res) => {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  })

  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      });
    }
  })

});

// logout

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.listen("3000", () => {
  console.log("Server started on port 3000");
})
