"use strict";

const dotenv = require("dotenv").config();
const express = require("express");
const superagent = require("superagent");
const pg = require("pg");

const app = express();
const PORT = process.env.PORT || 5000;
const DATABASE_URL = process.env.DATABASE_URL;

const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

//app.use(express.static('./public/styles'));

app.use(express.static("./public"));
// app.use(express.urlencoded({extended:true,}));

function Book(info) {
    const placeholderImage = "https://i.imgur.com/J5LVHEL.jpg";
    this.image = info.volumeInfo.imageLinks ? info.volumeInfo.imageLinks.thumbnail : placeholderImage;
    this.title = info.volumeInfo.title || "No title available";
    this.authors = info.volumeInfo.authors || "The author not provided";
    this.description = info.volumeInfo.description || info.subtitle || "The description not provided";
    this.ispn = info.volumeInfo.industryIdentifiers ? info.volumeInfo.industryIdentifiers.identifier : 'No ISBN founded';
    this.bookshelf = info.volumeInfo.categories ? info.volumeInfo.categories[0] : "None";
}

//retrieve from DB
app.get("/", (req, res) => {
    const selectQ = "SELECT * FROM books";
    client
        .query(selectQ)
        .then((selectResult) => {
            res.render("pages/index", {
                NumberOfBooks: selectResult.rows.length,
                results: selectResult.rows,
            });
        })
        .catch((error) => {
            handleError(req, res, error);
        });
});

app.get("/searches/new", (req, res) => {
    res.render("pages/searches/new.ejs");
});

app.post("/searches", createSearch);

function createSearch(req, res) {
    let url = "https://www.googleapis.com/books/v1/volumes";

    const searchBy = req.body.searchBy;
    const searchValue = req.body.search;
    const queryObj = {};
    if (searchBy === "title") {
        queryObj["q"] = `+intitle:${searchValue}`;
    } else if (searchBy === "author") {
        queryObj["q"] = `+inauthor:${searchValue}`;
    }

    superagent
        .get(url)
        .query(queryObj)
        .then((apiResponse) => {
            return apiResponse.body.items
                .slice(0, 10)
                .map((bookResult) => new Book(bookResult));
        })
        .then((results) => {
            res.render("pages/show", { searchResults: results });
        })
        .catch((error) => {
            handleError(req, res, error);
        });
}

app.get("/books/:id", (req, res) => {
    const bookId = req.params.id;
    //console.log(bookId);
    const selectQ = "SELECT * FROM books WHERE id=$1";
    const safeValues = [bookId];
    client
        .query(selectQ, safeValues)
        .then((results) => {
            res.render("pages/books/detail", { results: results.rows });
        })
        .catch((error) => {
            handleError(req, res, error);
        });
});

app.post("/books", (req, res) => {
    const { image, title, authors, description, ISBN, bookshelf } = req.body;
    //console.log(image);
    const insertQ =
        "INSERT INTO books (image, title, authors, description, ISBN, bookshelf) VALUES($1,$2,$3,$4,$5,$6) returning id;";
    const safeValues = [image, title, authors, description, ISBN, bookshelf];
    client
        .query(insertQ, safeValues)
        .then((results) => {
            res.redirect(`/books/${results.rows[0].id}`);
        })
        .catch((error) => {
            handleError(req, res, error);
        });
});

function handleError(req, res, error) {
    res.status(500).render("pages/error", {
        error: error,
        massage: "Oops..!Something went wrong",
    });
}

client.connect().then(() => {
    app.listen(PORT, () => {
        console.log("Connected to database", client.connectionParameters.database);
        console.log(`Listening to Port ${PORT}`);
    });
});