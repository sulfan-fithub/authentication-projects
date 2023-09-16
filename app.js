//jshint esversion:6
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const flash = require('express-flash');
const session = require('express-session');
const encrypt = require('mongoose-encryption');
const bcrypt = require('bcrypt');

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
        required: true, // Make sure email is required
        unique: true, // Ensure email is unique
    },
    password: String,
});


userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });

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

app.post("/register", async (req, res) => {
    const newUser = new User({
        username: req.body.email,
        password: req.body.password,
    });

    try {
        // Check if the email already exists
        const existingUser = await User.findOne({ username: newUser.email }).exec();
        if (existingUser) {
            // If email exists, send an error message
            req.flash("error", "Email already exists. Please use a different email.");
            return res.redirect("/register");
        } else {
            // Hash the password using bcrypt
            const hashedPassword = await bcrypt.hash(newUser.password, 10);
            newUser.password = hashedPassword;

            // Save the user with the hashed password
            await newUser.save();

            return res.render("secrets");
        }
    } catch (err) {
        console.error(err);
        req.flash("error", "Error registering.");
        return res.redirect("/register");
    }
});

app.post("/login", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    try {
        const foundUser = await User.findOne({ username: username }).exec();
        console.log(`Username: ${username}`);
        if (!foundUser) {
            // User not found, handle this case
            const errorMessage = "Username or password is incorrect.";
            return res.render("login", { errorMessage: errorMessage });
        }

        // Use the decrypted password from the found user
        const decryptedPassword = foundUser.password;

        // Use bcrypt.compare to compare the provided password with the hashed password
        const passwordsMatch = await bcrypt.compare(password, decryptedPassword);

        console.log(`Password: ${password}`);
        console.log(`Decrypted Password: ${decryptedPassword}`);


        if (passwordsMatch) {
            return res.render("secrets");
        } else {
            const errorMessage = "Username or password is incorrect.";
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
