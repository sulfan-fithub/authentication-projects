//jshint esversion:6

const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose')


const app = express();

app.use(express.static('public'));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended : true,
}))

app.get("/", (req,res) => {
    res.render("home");
})

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

const userSchema = {
    email: String,
    password: String
}

const User = mongoose.model("User", userSchema);

app.get("/login", (req,res) => {
    res.render("login");
})

app.get("/register", (req,res) => {
    res.render("register");
})


app.post("/register", (req, res) => {
    const newUser = new User({
        email: req.body.email,
        password: req.body.password,
    });

    newUser.save()
    .then(() => {
        res.render("secrets");
    })
    .catch((err) => {
        console.error(err);
    });
});

app.post("/login", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({ email: username })
        .then((foundUser) => {
            if (!foundUser) {
                res.render("login", { errorMessage: "Username or password is incorrect." });
            } else {
                if (password === foundUser.password) {
                    res.render("secrets");
                } else {
                    res.render("login", { errorMessage: "Username or password is incorrect." });
                }
            }
        })
        .catch((err) => {
            console.error(err);
            res.render("register", { errorMessage: "error registered." });
        });
});





const port = 3000

app.listen(port, ()=> {
    console.log(`server running on port ${port}`)
})