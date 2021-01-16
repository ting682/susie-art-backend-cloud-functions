import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin'
// const path = require('path')

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
admin.initializeApp()

// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//     response.send("hello again!")
//   // response.sendFile(path.join(__dirname+'/index.html'));
// });
const cors = require('cors')
const express = require('express');
const bodyParser = require('body-parser');
const { Client, Environment, ApiError } = require('square');

const app = express();

app.use(cors({origin: true}))
app.set('view engine', 'ejs'); 

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
  }

// Set the Access Token which is used to authorize to a merchant
// const accessToken = process.env.SANDBOX_ACCESS_TOKEN;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// app.use(express.static(__dirname));

// const exampleVar = process.env.SANDBOX_ID
// app.get("/", function (req :any, res :any) {
//     // res.sendFile(__dirname + '/index.html');
//     res.render("home", {exampleVar}) 
//    })

// Initialized the Square api client:
//   Set sandbox environment for testing purpose
//   Set access token
const client = new Client({
  environment: Environment.Sandbox,
  accessToken: functions.config().square.accesstoken,
});

app.post('/payments', async (req: any, res: any) => {
  const requestParams = req.body;

  
  
  // Charge the customer's card
  const paymentsApi = client.paymentsApi;
  const requestBody = {
    sourceId: requestParams.nonce,
    amountMoney: {
      amount: requestParams.amount, // $1.00 charge
      currency: 'USD',
    },

    locationId: requestParams.location_id,
    idempotencyKey: requestParams.idempotency_key,
  };

  try {
    const response = await paymentsApi.createPayment(requestBody);
    res.status(200).json({
      'title': 'Payment Successful',
      'result': response.result,
    });
  } catch(error) {
    let errorResult = null;
    if (error instanceof ApiError) {
      errorResult = error.errors;
    } else {
      errorResult = error;
    }
    res.status(500).json({
      'title': 'Payment Failure',
      'result': errorResult,
    });
  }
});


exports.payments = functions.https.onRequest(app)

// import { v4 as uuidv4 } from 'uuid'
const jwt = require('jsonwebtoken')

const cart = express();
cart.use(cors({origin: true, preflightContinue: true}))

const cookieParser = require('cookie-parser');
cart.use(cookieParser());

cart.set('view engine', 'ejs'); 

cart.use(bodyParser.json());
cart.use(bodyParser.urlencoded({ extended: false }));

// cart.use(function(req :any, res :any, next :any) {
//   req.setHeader("Access-Control-Allow-Origin", "http://localhost:3002");
//   req.setHeader('Access-Control-Allow-Credentials', "true")
//   req.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//   req.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//   next();
// });

cart.post('/carts', cors({origin: true}), (req: any, res: any) => {

  const requestParams = req.body;

  const cartsRef = admin.database().ref('carts/' + requestParams.uid)

  cartsRef.set({
    uid: requestParams.uid,
    lineItems: requestParams.lineItems,
  }).then(resp => {
    
    const jwtToken = jwt.sign({uid: requestParams.uid,  lineItems: requestParams.lineItems}, functions.config().jwt.secret)

    res.status(200).cookie('authcookie', jwtToken , { maxAge:900000, httpOnly:true }).send({jwtToken})
    
  }).catch(err => {
    res.json({error: err})
    res.status(500).send()
  })

  

  // let userRef = admin.database().ref('users/' + requestParams.uid)

  // userRef.update({
  //   uid: requestParams.uid

  // })
  
})


cart.get('/carts', async (req: any, res: any) => {

  res.render('index.html')

  // const authCookie = req.cookies.authcookie

  // jwt.verify(authCookie, functions.config().jwt.secret, (err :any, data :any) => {
  //   if(err){
  //     res.sendStatus(403)
  //   } 
  //   else if(data.uid){
  //     req.uid = data.uid

  //     const cartsRef = admin.database().ref('carts/' + data.uid)


  //     cartsRef.once('value').then(snap => {
  //       res.send(JSON.stringify({lineItems: snap.val().lineItems}))
  //     }).catch(errorData => {
  //       res.json({error: errorData})
  //     })
      
  //  }
  // })


})

// const corsHandler = cors({origin: "http://localhost:3002", credentials: true})

exports.carts = functions.https.onRequest(cart)
