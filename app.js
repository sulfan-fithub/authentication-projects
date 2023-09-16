//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const flash = require('express-flash');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

const app = express();

app.use(express.static('public'));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended: true,
}));
app.use(flash());
app.use(session({
    secret: 'secret cat',
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: String,
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });


const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/login", (req, res) => {
    const errorMessage = req.flash("error");
    res.render("login", { errorMessage: errorMessage });
});

app.get("/register", (req, res) => {
    const errorMessage = req.flash("error");
    res.render("register", { errorMessage: errorMessage });
});

app.get("/secrets", (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    // Render the secrets page here
    res.render("secrets")
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



app.post("/login", passport.authenticate("local", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
    failureFlash: true
}));

const port = 3000;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
