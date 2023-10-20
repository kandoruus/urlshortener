require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI, { useUnifiedTopology: true, useNewUrlParser: true });

//Setup Mongoose
const urlSchema = new mongoose.Schema({
  originalUrl: String,
  shortUrl: Number,
});

const Url = mongoose.model("Url", urlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

//validation algorithm found here: https://www.freecodecamp.org/news/check-if-a-javascript-string-is-a-url/#:~:text=You%20can%20use%20the%20URLConstructor,given%20URL%20is%20not%20valid.
const isValidUrl = (urlString) => {
  let url;
  try {
    url = new URL(urlString);
  } catch (e) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
};

//check if url is in DB
const urlIsNew = async (originalUrl) => {
  return !(await Url.exists({ originalUrl: originalUrl }));
};

const shortUrlIsValid = async (shortUrl) => {
  return await Url.exists({ shortUrl: shortUrl });
};

//add new url to DB and return its short url
const getNewShortUrl = async (originalUrl) => {
  let newShortUrl = (await Url.find({})).length;
  await Url.create({ originalUrl: originalUrl, shortUrl: newShortUrl });
  return newShortUrl;
};

//fetchs the short url from the DB
const getShortUrl = async (originalUrl) => {
  return (await Url.findOne({ originalUrl: originalUrl })).shortUrl;
};

//
const getOriginalUrl = async (shortUrl) => {
  return (await Url.findOne({ shortUrl: shortUrl })).originalUrl;
};

const getUrlJson = async (originalUrl) => {
  if (await urlIsNew(originalUrl)) {
    return { original_url: originalUrl, short_url: await getNewShortUrl(originalUrl) };
  } else {
    return { original_url: originalUrl, short_url: await getShortUrl(originalUrl) };
  }
};

const handleShorturlInput = async (inputString) => {
  if (isValidUrl(inputString)) {
    return await getUrlJson(inputString);
  } else {
    return { error: "invalid url" };
  }
};

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.post("/api/shorturl", async function (req, res) {
  res.json(await handleShorturlInput(req.body.url));
});

app.get("/api/shorturl/:shortUrl?", async function (req, res) {
  if (req.params.shortUrl === undefined) {
    res.json({ error: "No short URL provided" });
  } else if (await shortUrlIsValid(req.params.shortUrl)) {
    res.redirect(await getOriginalUrl(req.params.shortUrl));
  } else {
    res.json({ error: "No short URL found for the given input" });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
