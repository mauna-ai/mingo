var test = require('tape')
var performance = require('perf_hooks').performance
var mingo = require('../dist/mingo')
var _ = require('lodash');

const items = _.range(10 * 1000).map(id => {
  return {
    id: id,
    name: `item ${id}`,
    active: true,
    books: _.range(10).map(bookId => {
      return {
        id: bookId,
        title: `book ${bookId}`
      };
    }),
    authors: _.range(10).map(authorId => {
      return {
        id: authorId,
        name: `author ${authorId}`
      };
    })
  };
});

test('Aggregation performance', function (t) {
  const time1 = performance.now();
  const metrics = mingo.aggregate(items, [
    {
      $match: {
        'active': true
      }
    },
    {
      $project: {
        'booksSize': {$size: '$books'},
        'authorsSize': {$size: '$authors'}
      }
    },
    {
      $group: {
        '_id': void 0,
        'maxBooksCount': {$max: '$booksSize'},
        'allBooksSum': {$sum: '$booksSize'},
        'avgBooksCount': {$avg: '$booksSize'},
        'maxAuthorsCount': {$max: '$authorsSize'},
        'allAuthorsSum': {$sum: '$authorsSize'},
        'avgAuthorsCount': {$avg: '$authorsSize'}
      }
    }
  ]);

  const time2 = performance.now()
  const elapsed = (time2 - time1)
  // allow 2sec because GC times are longer on less powerful hardware.
  t.assert(elapsed < 2000, `elapsed time ${elapsed}ms should be less than a 2sec`)
  t.end()
})

test("Sorting performance", function (t) {
  function makeid(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  const arrayToSort = [];
  for(var i = 0; i < 5000; i++){
    arrayToSort.push(makeid(20));
  }

  const mingoSorter1 = new mingo.Aggregator(
                  [
                      { $sort: {
                          number: 1
                      } }
                  ],
                  {
                      collation: {
                          locale: 'en',
                          strength: 1
                      }
                  }
              );
  const mingoSorter2 = new mingo.Aggregator(
                  [
                      { $sort: {
                          number: 1
                      } }
                  ]
              );

  console.time('MINGO SORT WITH LOCALE');
  const result1 = mingoSorter1.run(arrayToSort);
  console.timeEnd('MINGO SORT WITH LOCALE');

  console.time('MINGO SORT WITHOUT LOCALE');
  const result2 = mingoSorter2.run(arrayToSort);
  console.timeEnd('MINGO SORT WITHOUT LOCALE');

  console.time('NATIVE SORT WITH LOCALE');
  const result4 = arrayToSort.concat().sort(function (a,b){
      const r = a.localeCompare(b, "en", {sensitivity:'base'})
      if (r < 0) return -1
      if (r > 0) return 1
      return 0
  });
  console.timeEnd('NATIVE SORT WITH LOCALE');

  console.time('NATIVE SORT WITHOUT LOCALE');
  const result3 = arrayToSort.concat().sort();
  console.timeEnd('NATIVE SORT WITHOUT LOCALE');
  t.end()
})