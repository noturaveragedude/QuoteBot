const functions = require('firebase-functions')

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!")
// })

var twit = require('twit')
var config = require('./config.js')
var env = require('./environment.js')
var firebaseAdmin = require('firebase-admin')
var Twitter = new twit(config)

var admin = require('firebase-admin')
admin.initializeApp(functions.config().firebase)

exports.showTwitter = functions.https.onRequest((request, response) => {
    response.send(Twitter)
})


var XMLHttpRequest = require('xhr2')
var getJSON = function (url, token, callback) {
    var xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.setRequestHeader("Authorization", "Bearer " + token)
    xhr.responseType = 'json'
    xhr.onload = function () {
        var status = xhr.status
        if (status === 200) {
            callback(null, xhr.response)
        } else {
            callback(status, xhr.response)
        }
    }
    xhr.send()
}

var setExists = status => {
    exists = status
}

var parseQuoteFromTweet = tweet => {
    match = tweet.full_text.split('—')
    return {
        id: tweet.id,
        body: match[0].replace(srcTwitterAccount, "").trim(),
        author: match[1].trim(),
        url: match[2].trim()
    }
}

var tweetQuote = quote => {
    return "Chief! @ObasekiEtinosa, I've posted '" + quote.body + "' by " + quote.author
}

var url = env.api_base_url + env.api_search_url + env.api_search_query
var token = env.api_token
var approvedUserId = env.approved_user_id
var srcTwitterAccount = env.src_twitter_account

exports.getTweetMentions = functions.https.onRequest((request, response) => {
    getJSON(url, token, function (error, data) {
        if (error !== null) {
            return console.error(error)
        }
        tweets = data.statuses
        quotes = []
        tweets.forEach(tweet => {
            if (tweet.user.id === approvedUserId && tweet.full_text.includes("—")) {
                let quote = parseQuoteFromTweet(tweet)
                let exists = false
                firebaseAdmin.database().ref('quotes/' + quote.id).once("value", snapshot => {
                    setExists(snapshot.exists())
                })
                return response.send({exists: exists, quote: quote, id:'quotes/' + quote.id})
                if (!exists) {
                    firebaseAdmin.database().ref('quotes').child(quote.id).set(quote)
                    // return response.send({"statuses": tweetQuote(quote)})
                    Twitter.post('statuses/update', {"status": tweetQuote(quote)}, function (error, tweet) {
                        if (error) {
                            return console.error("Error posting tweet: " + error)
                        }
                        else {
                            return console.log("Tweet posted")
                        }
                    })
                    quotes.push(quote)
                }
            }
        })
        return console.log({quotes, "message": quotes.length + " Quotes added successfully"})
    })
})

exports.scheduleTweetToQuote = functions.pubsub.schedule('every 10 minutes').onRun((context) => {
    getJSON(url, token, function (error, data) {
        if (error !== null) {
            return console.error(error)
        }
        tweets = data.statuses
        quotes = []
        tweets.forEach(tweet => {
            if (tweet.user.id === approvedUserId && tweet.full_text.includes("—")) {
                let quote = parseQuoteFromTweet(tweet)
                var exists = false
                firebaseAdmin.database().ref('quotes').child(quote.id).once("value", (snapshot => {
                    exists = snapshot.exists()
                }))
                if (!exists) {
                    firebaseAdmin.database().ref('quotes').child(quote.id).set(quote)
                    // return response.send({"statuses": tweetQuote(quote)})
                    Twitter.post('statuses/update', {"status": tweetQuote(quote)}, function (error, tweet) {
                        if (error) {
                            return console.error("Error posting tweet: " + error)
                        }
                        else {
                            return console.log("Tweet posted")
                        }
                    })
                    quotes.push(quote)
                }
            }
        })
        return console.log({quotes, "message": quotes.length + " Quotes added successfully"})
    })
})
