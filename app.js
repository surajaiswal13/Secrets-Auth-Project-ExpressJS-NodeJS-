require("dotenv").config();
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');
// const md5 = require('md5');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

// Database

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

// console.log(process.env.SECRET);

// const secret = process.env.SECRET
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });

const User = mongoose.model("User", userSchema);

// Home

app.get("/", (req, res) => {
  res.render("home")
});

// Register

app.route("/register")

.get((req, res) => {
  res.render("register")
})

.post((req, res) => {

  bcrypt.hash(req.body.password, saltRounds, (err, hash) => {

    username = req.body.username
    password = hash

    const newUser = new User({
      email: username,
      password: password
    })

    newUser.save((err) => {
      if (err){
        console.log(err);
      } else {
        res.render("secrets")
      }
    });

  });

});

// login

app.route("/login")

.get((req, res) => {
  res.render("login")
})

.post((req, res) => {

  const username = req.body.username;
  const password = req.body.password;

  User.findOne({email: username}, (err, foundUser) => {
    if (!err) {
      if (foundUser) {
        bcrypt.compare(password, foundUser.password, function(err, results) {

          if (results === true) {
            res.render("secrets")
          } else {
            res.send("Wrong Password");
          }

        });

      } else {
        res.send("User not Found !")
      }
    } else {
      res.send(err);
    }
  });
});

app.listen("3000", () => {
  console.log("Server started on port 3000");
})
