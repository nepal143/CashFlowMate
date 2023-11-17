const express = require("express");
const path = require("path");
const hbs = require("hbs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const User = require("./models/User");
// app.js
const Person = require('./models/Person');

const Transaction = require("./models/Transaction");
const HistoryTransaction = require("./models/HistoryTransaction");
const moment = require('moment');


hbs.registerHelper('formatDate', (date) => {
    return moment(date).format('MMMM Do YYYY, h:mm:ss a');
});

const app = express();
const port = process.env.PORT || 3010;

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await User.findOne({ username });

      if (!user) {
        return done(null, false, { message: "Incorrect username" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return done(null, false, { message: "Incorrect password" });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

app.set("views", path.join(__dirname, "/../templates/views"));
app.set("view engine", "hbs");
hbs.registerPartials(path.join(__dirname, "/../templates/partials"));
app.use(express.static(path.join(__dirname, "/../public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: "your-secret-key",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());


const uri =
  "mongodb+srv://nepalsss008:nepalsingh@cluster0.sutmgl0.mongodb.net/?retryWrites=true&w=majority&appName=AtlasApp";

  async function connection() {
    await mongoose.connect(uri, {
      useUnifiedTopology: true, // Keep this option for unified topology
      // Remove the useNewUrlParser option
    });
    console.log("Connected successfully to MongoDB");
  }

try {
  connection();
} catch (error) {
  console.log(error);
}


app.get("/", (req, res) => {
  res.render("index", { title: "Your Page Title", user: req.user });
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.render("register", { error: "User already exists" });
    }

    const newUser = new User({ username, password });
    await newUser.save();

    res.redirect("/login");
  } catch (error) {
    console.error(error);
    res.render("register", { error: "Registration failed" });
  }
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

app.get("/transaction", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const transactions = await Transaction.find({ userId });
    res.render("transaction", { user: req.user.username, transactions });
  } catch (error) {
    console.error(error);
    res.render("error", { error: "Failed to fetch transactions" });
  }
});
// app.js

// app.js
// ...

// ...
app.get('/see-transactions', isAuthenticated, async (req, res) => {
  try {
    // Fetch persons data from the database (assuming you have a Person model)
    const persons = await Person.find({ userId: req.user._id });

    // Fetch all transactions from the database
    const transactions = await Transaction.find({ userId: req.user._id }).populate('personId', 'name');

    res.render('see-transactions', { user: req.user.username, persons, transactions: transactions }); // Change 'allTransactions' to 'transactions'
  } catch (error) {
    console.error(error);
    res.render('error', { error: 'Failed to fetch transactions for viewing' });
  }
});






app.post("/delete-transaction/:id", isAuthenticated, async (req, res) => {
  try {
    const transactionId = req.params.id;
    console.log('Deleting transaction with ID:', transactionId);
    const deletedTransaction = await Transaction.findByIdAndDelete(transactionId);

    if (!deletedTransaction) {
      return res.render("error", { error: "Transaction not found" });
    }

    const historyTransaction = new HistoryTransaction(deletedTransaction.toObject());
    await historyTransaction.save();

    res.redirect("/see-transaction");
  } catch (error) {
    console.error(error);
    res.render("error", { error: "Failed to delete transaction" });
  }
});


// app.js

app.post('/add-transaction', isAuthenticated, async (req, res) => {
  try {
    const { personId, amount, type, note } = req.body;
    const userId = req.user._id;

    // Check if personId is provided
    if (!personId) {
      return res.render('error', { error: 'Person ID is required for the transaction' });
    }

    const newTransaction = new Transaction({ userId, personId, amount, type, note });
    await newTransaction.save();

    res.redirect('/transaction');
  } catch (error) {
    console.error(error);
    res.render('error', { error: 'Failed to add transaction' });
  }
});

app.get('/history', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        const historyTransactions = await HistoryTransaction.find({ userId });
        if (historyTransactions) {
            res.render('history', { user: req.user.username, historyTransactions });
        } else {
            res.render('history', { user: req.user.username, historyTransactions: [] });
        }
    } catch (error) {
        console.error(error);
        res.render('error', { error: 'Failed to fetch history transactions' });
    }
});

app.get('/add-person', isAuthenticated, (req, res) => {
  res.render('add-person', { user: req.user.username });
});

app.post("/add-person", isAuthenticated, async (req, res) => {
  const { personName } = req.body;

  try {
    // Save the person to the database
    // Assuming you have a Person model
    const newPerson = new Person({ name: personName, userId: req.user._id });
    await newPerson.save();
    console.log(newPerson);
    res.redirect('/add-person'); // Redirect to home after adding the person
  } catch (error) {
    console.error(error);
    res.render('error', { error: 'Failed to add person' });
  }
});

app.listen(port, () => {
  console.log(`The server is running on port ${port}`);
});
