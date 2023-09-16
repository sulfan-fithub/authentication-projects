//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const flash = require('express-flash');
const session = require('express-session');
const bcrypt = require('bcrypt')

const app = express();

app.use(express.static('public'));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended: true,
}));
app.use(flash());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: String,
});


const User = mongoose.model("User", userSchema);

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

const saltRounds = 10;

app.post("/register", async (req, res) => {
    try {
        // Hash password dengan menggunakan bcrypt
        bcrypt.hash(req.body.password, saltRounds, async function(err, hash) {
            if (err) {
                console.error(err);
                req.flash("error", "Error registering.");
                return res.redirect("/register");
            }

            const newUser = new User({
                email: req.body.email,
                password: hash,
            });

            // Cari pengguna dengan email yang sama
            const existingUser = await User.findOne({ email: newUser.email }).exec();
            if (existingUser) {
                req.flash("error", "Email already exists. Please use a different email.");
                return res.redirect("/register");
            } else {
                // Simpan pengguna dengan password yang di-hash
                await newUser.save();
                return res.render("secrets");
            }
        });
    } catch (err) {
        console.error(err);
        req.flash("error", "Error registering.");
        return res.redirect("/register");
    }
});


app.post("/login", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    try {
        const foundUser = await User.findOne({ email: email }).exec();
        if (!foundUser) {
            const errorMessage = "Email or password is incorrect.";
            return res.render("login", { errorMessage: errorMessage });
        }

        const hashedPassword = foundUser.password;

        //bcrypt.compare untuk membandingkan password yang diterima dengan password di database
        const passwordsMatch = await bcrypt.compare(password, hashedPassword);

        if (passwordsMatch) {
            return res.render("secrets");
        } else {
            const errorMessage = "Email or password is incorrect.";
            return res.render("login", { errorMessage: errorMessage });
        }
    } catch (err) {
        console.error(err);
        const errorMessage = "An error occurred during login.";
        return res.render("login", { errorMessage: errorMessage });
    }
});

const port = 3000;

app.listen(port, () => {
    console.log(`server running on port ${port}`);
});
