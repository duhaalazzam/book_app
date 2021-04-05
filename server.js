
'use strict';

const express = require('express');
const superagent = require('superagent');

const app = express();
const PORT = process.env.PORT || 3030;

app.use(express.urlencoded());
app.set('view engine', 'ejs');

//app.use(express.static('./public/styles'));

app.use(express.static('./public'));
// app.use(express.urlencoded({extended:true,}));

function Book(info) {
  const placeholderImage = 'https://i.imgur.com/J5LVHEL.jpg';
  this.image = info.imageLinks ? info.imageLinks.thumbnail : placeholderImage;
  this.title = info.title || 'No title available';
  this.authors = info.authors || 'The author not provided';
  this.description = info.description || info.subtitle || 'The description not provided';

}
app.get('/', (req, res) => {
  res.render('pages/index');
});

app.get('/searches/new', (req, res) => {
  res.render('pages/searches/new.ejs');

});


app.post('/searches', createSearch);

function createSearch(req, res) {
  let url = 'https://www.googleapis.com/books/v1/volumes';

  const searchBy = req.body.searchBy;
  const searchValue = req.body.search;
  const queryObj = {};
  if (searchBy === 'title') {
    queryObj['q'] = `+intitle:${searchValue}`;

  } else if (searchBy === 'author') {
    queryObj['q'] = `+inauthor:${searchValue}`;
  }

  superagent.get(url).query(queryObj).then(apiResponse => {
    return apiResponse.body.items.slice(0, 10).map(bookResult => new Book(bookResult.volumeInfo))
  }).then(results => {
    res.render('pages/show', { searchResults: results })
  }).catch(error => {
    res.render('pages/error', { error: error });
  });
}

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));