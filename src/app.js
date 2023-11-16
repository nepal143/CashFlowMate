const express = require("express");
const path = require("path");
const hbs = require("hbs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const port = process.env.PORT || 3010;
const User = require("./models/User");
const app = express();
const session = require("express-session");  

console.log(__dirname);
app.set("views", path.join(__dirname, "/../templates/views"));
app.set("view engine", "hbs");
hbs.registerPartials(path.join(__dirname, "/../templates/views/partials"));
app.use(express.static(path.join(__dirname, "/../public")));
app.use(
    session({
      secret: "your-secret-key", // Replace with a strong and secure key
      resave: true,
      saveUninitialized: true,
    })
  );
// Use express.urlencoded() to parse form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.render("index", { title: "Your Page Title" });
});

// Registration page
app.get("/register", (req, res) => {
  res.render("register");
});

// Login page
app.get("/login", (req, res) => {
  res.render("login");
});

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    res.redirect("/");
  });
});

// Registration POST request
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  console.log(req.body);

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.render("register", { error: "User already exists" });
    }

    // Create a new user
    const newUser = new User({ username, password });

    // Save the user to the database
    await newUser.save();

    // Redirect to login page after registration
    res.redirect("/login");
  } catch (error) {
    console.error(error);
    res.render("register", { error: "Registration failed" });
  }
});

// Login POST request
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ username });

    if (!user) {
      return res.render("login", { error: "Invalid username or password" });
    }  

    // Compare the entered password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.render("login", { error: "Invalid username or password" });
    }

    // Set user in the session and redirect to the home page
    req.session.user = user.username;
    console.log("login sucessfully") ; 
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.render("login", { error: "Login failed" });
  }
});

// db connection
const uri = "mongodb+srv://nepalsss008:nepalsingh@cluster0.sutmgl0.mongodb.net/?retryWrites=true&w=majority&appName=AtlasApp"; // Replace with your MongoDB Atlas URI

async function connection() {
  await mongoose.connect(uri);
  console.log("connected successfully ");
}

try {
  connection();
} catch (error) {
  console.log(error);
}

app.listen(port, () => {
  console.log(`The server is running on port ${port}`);
});
