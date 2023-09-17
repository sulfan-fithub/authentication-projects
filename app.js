//jshint esversion:6

// Import necessary modules
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const flash = require('express-flash');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

// Create an Express app
const app = express();

// Configure app settings
app.use(express.static('public'));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(flash());
app.use(session({
    secret: 'secret cat',
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });

// Define user schema and model
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String,
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id)
      .then(user => {
        done(null, user);
      })
      .catch(err => {
        done(err, null);
      });
});

// Configure Google OAuth 2.0 strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

// Define routes and their handlers
app.get("/", (req, res) => {
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets page.
    res.redirect("/secrets");
});

app.get("/login", (req, res) => {
    const errorMessage = req.flash("error");
    res.render("login", { errorMessage: errorMessage });
});

app.get("/register", (req, res) => {
    const errorMessage = req.flash("error");
    res.render("register", { errorMessage: errorMessage });
});

app.get("/secrets", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.redirect('/login');
      
      const foundUsers = await User.find({ "secret": { $ne: null } }).exec();
      
      res.render("secrets", { userWithSecrets: foundUsers });
    } catch (err) {
      console.error(err);
      // Handle the error here, e.g., send an error response or redirect to an error page.
      res.status(500).send("An error occurred.");
    }
  });
  

app.get("/submit", (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    res.render("submit")
});

app.post("/submit", async (req, res) => {
    try {
      const submittedSecret = req.body.secret;
      const foundUser = await User.findById(req.user.id);
  
      if (foundUser) {
        foundUser.secret = submittedSecret;
        await foundUser.save();
      }
  
      res.redirect("/secrets");
    } catch (err) {
      console.error(err);
      // Handle the error here, e.g., send an error response or redirect to an error page.
      res.status(500).send("An error occurred.");
    }
});

app.get("/logout", (req, res) => {
    req.logout(function(err) {
        if (err) {
            console.error(err);
        }
        res.redirect("/");
    });
});

app.post("/register", async (req, res) => {
    try {
        await User.register({ email: req.body.email }, req.body.password);
        passport.authenticate("local")(req, res, () => {
            res.redirect("/secrets");
        });
    } catch (err) {
        console.error(err); // Log the error for debugging

        if (err.name === "MongoError" && err.code === 11000) {
            // Duplicate email error
            req.flash("error", "Email address is already registered.");
            res.redirect("/register");
        } else {
            // Other registration errors
            console.error(err);
            req.flash("error", "Error registering: " + err.message); // Display the specific error message
            res.render("register", { errorMessage: req.flash("error") });
        }
    }
});

// Start the server
const port = 3000;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
