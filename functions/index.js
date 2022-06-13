const functions = require('firebase-functions');
const admin = require('firebase-admin'); // The Firebase Admin SDK to access the Firebase Realtime Database.
const firebase = admin.initializeApp(functions.config().firebase);
const async = require('async');
const _ = require('lodash');
const uuid = require('uuid');
const tagUtil = require('./tagUtil');
const FieldValue = require("firebase-admin").firestore.FieldValue;
const { Storage } = require('@google-cloud/storage');
const os = require('os');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require("express-session");
const FirestoreStore = require('firestore-store')(session);
const spawn = require('child-process-promise').spawn;
const app = express(); // Used for Stripe calls
const gcs = new Storage();
const info = functions.config().info;
const settings = { timestampsInSnapshots: true };
admin.firestore().settings(settings);

// initialize stripe for onboarding end users
// See: https://stripe.com/docs/connect/standard-accounts
const stripe = require("stripe")(functions.config().stripe.secret);
const stripeWebhook = require("stripe")(functions.config().keys.webhooks);
const endpointSecret = functions.config().keys.signing;
const connectedEndpointSecret = functions.config().keys.connectedsigning;

// Allow cross-origin requests for onboarding end users
app.use(cors({ origin: true }));

// initialize session to remember accountId and returnUrl for onboarding end users
app.use(
  session({
    store: new FirestoreStore({
      database: firebase.firestore()
    }),
    name: '__session', // required for Cloud Functions/Cloud Run
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true
  })
);

// send back the account link url to enable the web client to start the onboarding process
// See: https://stripe.com/docs/api/account_links/object
app.post("/onboard-user", async (req, res) => {
  try {
    const account = await stripe.accounts.create({ type: "standard" });

    // console.log('in onboarding user account before ' + JSON.stringify(account));

    req.session.accountId = account.id;
    req.session.returnUrl = req.body.returnUrl;

    const accountAfter = await stripe.accounts.retrieve(account.id);

    // console.log('in onboarding user account after ' + JSON.stringify(accountAfter));

    let requestedUid = req.body.uid;     // resource the user is requesting to modify
    let authToken = validateHeader(req); // current user encrypted

    if (!authToken) {
      res.status(403).send('Unauthorized access');
    }

    const uid = await decodeAuthToken(authToken);
    if (uid === requestedUid) {
      const origin = `${req.headers.origin}`;
      const accountLinkURL = await generateAccountLink(accountAfter.id, origin, req.session.returnUrl);
      const updateUser = await admin.firestore().collection('users').doc(uid).update({
        stripeAccountId: accountAfter.id,
        lastUpdateDate: FieldValue.serverTimestamp()
      });
      res.send({ url: accountLinkURL });
    } else {
      res.status(403).send('Unauthorized access');
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// The URL the user will be redirected to if the account link is expired, has been previously-visited,
// or is otherwise invalid. The URL you specify should attempt to generate a new account link with the
// same parameters used to create the original account link, then redirect the user to the new account link’s
// URL so they can continue with Connect Onboarding. If a new account link cannot be generated or the redirect
// fails you should display a useful error to the user.
// See: https://stripe.com/docs/api/account_links/object
app.get("/onboard-user/refresh", async (req, res) => {
  // console.log('in onboarding user refresh');

  if (!req.session.accountId) {
    res.redirect("/");
    return;
  }
  try {
    const accountId = req.session.accountId;
    const returnUrl = req.session.returnUrl;
    const origin = `${req.secure ? "https://" : "https://"}${req.headers.host}`;
    const accountLinkURL = await generateAccountLink(accountId, origin, returnUrl);
    res.redirect(accountLinkURL);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// generateAccountLink
// See: https://stripe.com/docs/api/account_links/object
function generateAccountLink(accountId, origin, returnUrl) {
  return stripe.accountLinks
    .create({
      type: "account_onboarding",
      account: accountId,
      refresh_url: 'https://us-central1-eleutherios-website.cloudfunctions.net/stripe/onboard-user/refresh', // `${origin}/onboard-user/refresh`
      return_url: returnUrl,
    })
    .then((link) => link.url);
};

// Helper to validate auth header is present
function validateHeader(req) {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    // console.log('auth header found')
    return req.headers.authorization.split('Bearer ')[1]
  }
};

// Helper to decode token to firebase UID (returns promise)
function decodeAuthToken(authToken) {
  return admin.auth()
    .verifyIdToken(authToken)
    .then(decodedToken => {
      // decode the current user's auth token
      return decodedToken.uid;
    }
  );
};

// export app as stripe API
// we have attached all of our routines to the app
// export it and make them publicly available
exports.stripe = functions.https.onRequest(app);

// listen to stripe webhook events test
exports.stripeEventsTest = functions.https.onRequest(async (req, res) => {
  let sig = req.headers["stripe-signature"];
  let event, intent, metadata;

  try {
    // Verify webhook signature and extract the event.
    // See https://stripe.com/docs/webhooks/signatures for more information.
    event = stripeWebhook.webhooks.constructEvent(req.rawBody, sig, endpointSecret); // Validate the request
    const eventDB = await admin.database().ref("events").push(event); // Add the event to the database

    // console.log('event ' + JSON.stringify(event));

    // switch (event.type) {
    //   case 'payment_intent.created':
    //     console.log('payment_intent.created');

    //     intent = event.data.object;
    //     metadata = intent.metadata; // { userId: userId, paymentId: paymentId }

    //     // update payment
    //     const createPaymentSnapshot = await admin.firestore().collection(`users/${metadata.buyerUserId}/payments`).doc(metadata.paymentId).get();
    //     const createPaymentRef = createPaymentSnapshot.ref;
    //     const payment = createPaymentSnapshot.data();
    //     await createPaymentRef.update({ status: 'Pending' });

    //     // create receipt
    //     const receiptId = uuid.v4().replace(/-/g, '');
    //     await admin.firestore().collection(`users/${payment.sellerUid}/receipts`).doc(receiptId).set({
    //       receiptId: receiptId,
    //       paymentId: payment.paymentId,
    //       amount: payment.amount,
    //       currency: payment.currency,
    //       title: payment.title,
    //       description: payment.description,
    //       quantity: payment.quantity,
    //       status: 'Pending',
    //       buyerUid: payment.buyerUid,
    //       buyerServiceId: payment.buyerServiceId,
    //       sellerUid: payment.sellerUid,
    //       sellerServiceId: payment.sellerServiceId,
    //       paymentIntent: intent,
    //       lastUpdateDate: FieldValue.serverTimestamp(),
    //       creationDate: FieldValue.serverTimestamp()
    //     });
    //     break;
    //   case 'payment_intent.succeeded':
    //     console.log('payment_intent.succeeded');

    //     intent = event.data.object;
    //     metadata = intent.metadata; // { userId: userId, paymentId: paymentId }

    //     // update payment
    //     const successPaymentSnapshot = await admin.firestore().collection(`users/${metadata.buyerUserId}/payments`).doc(metadata.paymentId).get();
    //     const successPaymentRef = successPaymentSnapshot.ref;
    //     const successPayment = successPaymentSnapshot.data();
    //     await successPaymentRef.update({ status: 'Success', lastUpdateDate: FieldValue.serverTimestamp() });

    //     // update receipt
    //     const successReceiptSnapshot = await admin.firestore().collection(`users/${successPayment.sellerUid}/receipts`).doc(successPayment.receiptId).get();
    //     const successReceiptRef = successReceiptSnapshot.ref;
    //     await successReceiptRef.update({ status: 'Success', lastUpdateDate: FieldValue.serverTimestamp() });
    //     break;
    //   case 'payment_intent.payment_failed':
    //     console.log('payment_intent.payment_failed');

    //     intent = event.data.object;
    //     metadata = intent.metadata; // { userId: userId, paymentId: paymentId }

    //     // update payment
    //     const failPaymentSnapshot = await admin.firestore().collection(`users/${metadata.buyerUserId}/payments`).doc(metadata.paymentId).get();
    //     const failPaymentRef = failPaymentSnapshot.ref;
    //     const failPayment = failPaymentSnapshot.data();
    //     await failPaymentRef.update({ status: 'Fail', lastUpdateDate: FieldValue.serverTimestamp() });

    //     // update receipt
    //     const failReceiptSnapshot = await admin.firestore().collection(`users/${failPayment.sellerUid}/receipts`).doc(failPayment.receiptId).get();
    //     const failReceiptRef = failReceiptSnapshot.ref;
    //     await failReceiptRef.update({ status: 'Fail', lastUpdateDate: FieldValue.serverTimestamp() });
    //     break;
    //   default:
    //     console.log('got unknown type ' + event.type);
    // }
    return res.json({ received: true });
  }
  catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// listen to stripe connected webhook events test
exports.stripeConnectedEventsTest = functions.https.onRequest(async (req, res) => {
  let sig = req.headers["stripe-signature"];
  let event;

  async function updateUserServices(userId, currency) {
    var snapshot = await admin.firestore().collection(`users/${userId}/services`).get();

    if (snapshot.size > 0){
      var promises = snapshot.docs.map(doc => {
        return new Promise((resolve, reject) => {
          doc.ref.update({
            currency: currency,
            lastUpdateDate: FieldValue.serverTimestamp()
          }).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      });

      Promise.all(promises).then(() => {
        return;
      })
      .catch(error => {
        throw error;
      });
    }
    else return;
  }

  try {
    // Verify webhook signature and extract the event.
    // See https://stripe.com/docs/webhooks/signatures for more information.
    event = stripeWebhook.webhooks.constructEvent(req.rawBody, sig, connectedEndpointSecret);

    // console.log('event ' + JSON.stringify(event));

    const connectedEventDB = await admin.database().ref("connectedevents").push(event); // Add the event to the database

    if (event.type == 'account.application.authorized'){
      // console.log('account.application.authorized');

      var snapshot = await admin.firestore().collection('users').where('stripeAccountId', '==', event.account).limit(1).get();

      if (snapshot.size > 0){
        var userRef = snapshot.docs[0].ref;
        var account = await stripe.accounts.retrieve(event.account);
        await userRef.update({ stripeOnboardingStatus: 'Authorized', stripeCurrency: account.default_currency, lastUpdateDate: FieldValue.serverTimestamp() });
        await updateUserServices(snapshot.docs[0].data().uid, account.default_currency);
      }
      return res.json({ received: true });
    }
    else if (event.type == 'account.application.deauthorized'){
      // console.log('account.application.deauthorized');

      var snapshot = await admin.firestore().collection('users').where('stripeAccountId', '==', event.account).limit(1).get();

      if (snapshot.size > 0){
        var userRef = snapshot.docs[0].ref;
        var account = await stripe.accounts.retrieve(event.account);
        await userRef.update({ stripeOnboardingStatus: 'Deauthorized', lastUpdateDate: FieldValue.serverTimestamp() });
      }
      return res.json({ received: true });
    }
    else if (event.type == 'account.updated'){
      // console.log('account.updated');

      var snapshot = await admin.firestore().collection('users').where('stripeAccountId', '==', event.account).limit(1).get();

      if (snapshot.size > 0){
        var userRef = snapshot.docs[0].ref;
        var account = await stripe.accounts.retrieve(event.account);
        await userRef.update({ stripeOnboardingStatus: account.charges_enabled ? 'Authorized' : 'Pending', stripeCurrency: account.default_currency, lastUpdateDate: FieldValue.serverTimestamp() });
        await updateUserServices(snapshot.docs[0].data().uid, account.default_currency);
      }
      return res.json({ received: true });
    }
    else if (event.type == 'payment_intent.created'){
      // console.log('payment_intent.created');

      var paymentIntent = event.data.object;
      var metadata = paymentIntent.metadata;

      // customer making this payment
      var paymentSnapshot = await admin.firestore().collection(`users/${metadata.buyerUserId}/payments`).doc(metadata.paymentId).get();
      var paymentRef = paymentSnapshot.ref;
      var payment = paymentSnapshot.data();

      if (paymentSnapshot.exists){
        // create receipt
        // Set receiptId and change status to pending to inform user we have received their payment
        await paymentRef.update({ status: 'Pending', lastUpdateDate: FieldValue.serverTimestamp() });
        await admin.firestore().collection(`users/${payment.sellerUid}/receipts`).doc(payment.receiptId).set({
          receiptId: payment.receiptId,
          uid: payment.sellerUid,
          paymentId: payment.paymentId,
          amount: payment.amount,
          currency: payment.currency,
          quantity: payment.quantity,
          status: 'Pending',
          buyerUid: payment.buyerUid,
          buyerServiceId: payment.buyerServiceId,
          buyerEmail: payment.buyerEmail,
          sellerUid: payment.sellerUid,
          sellerServiceId: payment.sellerServiceId,
          sellerEmail: payment.sellerEmail,
          paymentIntentId: payment.paymentIntentId,
          lastUpdateDate: FieldValue.serverTimestamp(),
          creationDate: FieldValue.serverTimestamp()
        });
      }
      return res.json({ received: true });
    }
    else if (event.type == 'payment_intent.succeeded'){
      // console.log('payment_intent.succeeded');

      var paymentIntent = event.data.object;
      var metadata = paymentIntent.metadata; // { userId: userId, paymentId: paymentId }

      // customer making this payment
      var paymentSnapshot = await admin.firestore().collection(`users/${metadata.buyerUserId}/payments`).doc(metadata.paymentId).get();
      var paymentRef = paymentSnapshot.ref;
      var payment = paymentSnapshot.data();

      if (paymentSnapshot.exists){
        // change status to pending to inform user we have received their payment and awaiting their payment
        await paymentRef.update({ status: 'Success', lastUpdateDate: FieldValue.serverTimestamp() });

        var userReceiptSnapshot = await admin.firestore().collection(`users/${payment.sellerUid}/receipts`).doc(payment.receiptId).get();
        var sellerSnapshot = await admin.firestore().collection(`users/${payment.sellerUid}/services`).doc(payment.sellerServiceId).get();

        if (userReceiptSnapshot.exists)
          await userReceiptSnapshot.ref.update({ status: 'Success', lastUpdateDate: FieldValue.serverTimestamp() });

        if (sellerSnapshot.exists){
          var sellerService = sellerSnapshot.data();

          if (sellerService.typeOfPayment == 'One-off')
            await sellerSnapshot.ref.update({ paymentId: payment.paymentId, paymentUserId: payment.uid, indexed: false, lastUpdateDate: FieldValue.serverTimestamp() });
        }
      }
      return res.json({ received: true });
    }
    else if (event.type == 'payment_intent.payment_failed'){
      // console.log('payment_intent.payment_failed');

      var paymentIntent = event.data.object;
      var metadata = paymentIntent.metadata; // { userId: userId, paymentId: paymentId }

      // customer making this payment
      var paymentSnapshot = await admin.firestore().collection(`users/${metadata.buyerUserId}/payments`).doc(metadata.paymentId).get();
      var paymentRef = paymentSnapshot.ref;
      var payment = paymentSnapshot.data();

      if (paymentSnapshot.exists){
        // change status to pending to inform user we have received their payment and awaiting their payment
        await paymentRef.update({ status: 'Failed', lastUpdateDate: FieldValue.serverTimestamp() });

        var userReceiptSnapshot = await admin.firestore().collection(`users/${payment.sellerUid}/receipts`).doc(payment.receiptId).get();

        if (userReceiptSnapshot.exists)
          await userReceiptSnapshot.ref.update({ status: 'Failed', lastUpdateDate: FieldValue.serverTimestamp() });
      }
      return res.json({ received: true });
    }
    else {
      // console.log('Unknown event.type ' + event.type);
      return res.json({ received: true });
    }
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// listen to stripe webhook events
exports.stripeEvents = functions.https.onRequest(async (req, res) => {
  let sig = req.headers["stripe-signature"];
  let event, intent, metadata;

  try {
    // Verify webhook signature and extract the event.
    // See https://stripe.com/docs/webhooks/signatures for more information.
    event = stripeWebhook.webhooks.constructEvent(req.rawBody, sig, endpointSecret); // Validate the request
    const eventDB = await admin.database().ref("events").push(event); // Add the event to the database

    // console.log('event ' + JSON.stringify(event));

    // switch (event.type) {
    //   case 'payment_intent.created':
    //     console.log('payment_intent.created');

    //     intent = event.data.object;
    //     metadata = intent.metadata; // { userId: userId, paymentId: paymentId }

    //     // update payment
    //     const createPaymentSnapshot = await admin.firestore().collection(`users/${metadata.buyerUserId}/payments`).doc(metadata.paymentId).get();
    //     const createPaymentRef = createPaymentSnapshot.ref;
    //     const payment = createPaymentSnapshot.data();
    //     await createPaymentRef.update({ status: 'Pending' });

    //     // create receipt
    //     const receiptId = uuid.v4().replace(/-/g, '');
    //     await admin.firestore().collection(`users/${payment.sellerUid}/receipts`).doc(receiptId).set({
    //       receiptId: receiptId,
    //       paymentId: payment.paymentId,
    //       amount: payment.amount,
    //       currency: payment.currency,
    //       title: payment.title,
    //       description: payment.description,
    //       quantity: payment.quantity,
    //       status: 'Pending',
    //       buyerUid: payment.buyerUid,
    //       buyerServiceId: payment.buyerServiceId,
    //       sellerUid: payment.sellerUid,
    //       sellerServiceId: payment.sellerServiceId,
    //       paymentIntent: intent,
    //       lastUpdateDate: FieldValue.serverTimestamp(),
    //       creationDate: FieldValue.serverTimestamp()
    //     });
    //     break;
    //   case 'payment_intent.succeeded':
    //     console.log('payment_intent.succeeded');

    //     intent = event.data.object;
    //     metadata = intent.metadata; // { userId: userId, paymentId: paymentId }

    //     // update payment
    //     const successPaymentSnapshot = await admin.firestore().collection(`users/${metadata.buyerUserId}/payments`).doc(metadata.paymentId).get();
    //     const successPaymentRef = successPaymentSnapshot.ref;
    //     const successPayment = successPaymentSnapshot.data();
    //     await successPaymentRef.update({ status: 'Success', lastUpdateDate: FieldValue.serverTimestamp() });

    //     // update receipt
    //     const successReceiptSnapshot = await admin.firestore().collection(`users/${successPayment.sellerUid}/receipts`).doc(successPayment.receiptId).get();
    //     const successReceiptRef = successReceiptSnapshot.ref;
    //     await successReceiptRef.update({ status: 'Success', lastUpdateDate: FieldValue.serverTimestamp() });
    //     break;
    //   case 'payment_intent.payment_failed':
    //     console.log('payment_intent.payment_failed');

    //     intent = event.data.object;
    //     metadata = intent.metadata; // { userId: userId, paymentId: paymentId }

    //     // update payment
    //     const failPaymentSnapshot = await admin.firestore().collection(`users/${metadata.buyerUserId}/payments`).doc(metadata.paymentId).get();
    //     const failPaymentRef = failPaymentSnapshot.ref;
    //     const failPayment = failPaymentSnapshot.data();
    //     await failPaymentRef.update({ status: 'Fail', lastUpdateDate: FieldValue.serverTimestamp() });

    //     // update receipt
    //     const failReceiptSnapshot = await admin.firestore().collection(`users/${failPayment.sellerUid}/receipts`).doc(failPayment.receiptId).get();
    //     const failReceiptRef = failReceiptSnapshot.ref;
    //     await failReceiptRef.update({ status: 'Fail', lastUpdateDate: FieldValue.serverTimestamp() });
    //     break;
    //   default:
    //     console.log('got unknown type ' + event.type);
    // }
    return res.json({ received: true });
  }
  catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// listen to stripe connected webhook events
exports.stripeConnectedEvents = functions.https.onRequest(async (req, res) => {
  let sig = req.headers["stripe-signature"];
  let event;

  async function updateUserServices(userId, currency) {
    var snapshot = await admin.firestore().collection(`users/${userId}/services`).get();

    if (snapshot.size > 0){
      var promises = snapshot.docs.map(doc => {
        return new Promise((resolve, reject) => {
          doc.ref.update({
            currency: currency,
            lastUpdateDate: FieldValue.serverTimestamp()
          }).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      });

      Promise.all(promises).then(() => {
        return;
      })
      .catch(error => {
        throw error;
      });
    }
    else return;
  }

  try {
    // Verify webhook signature and extract the event.
    // See https://stripe.com/docs/webhooks/signatures for more information.
    event = stripeWebhook.webhooks.constructEvent(req.rawBody, sig, connectedEndpointSecret);

    // console.log('event ' + JSON.stringify(event));

    const connectedEventDB = await admin.database().ref("connectedevents").push(event); // Add the event to the database

    if (event.type == 'account.application.authorized'){
      console.log('account.application.authorized');

      var snapshot = await admin.firestore().collection('users').where('stripeAccountId', '==', event.account).limit(1).get();

      if (snapshot.size > 0){
        var userRef = snapshot.docs[0].ref;
        var account = await stripe.accounts.retrieve(event.account);
        await userRef.update({ stripeOnboardingStatus: 'Authorized', stripeCurrency: account.default_currency, lastUpdateDate: FieldValue.serverTimestamp() });
        await updateUserServices(snapshot.docs[0].data().uid, account.default_currency);
      }
      return res.json({ received: true });
    }
    else if (event.type == 'account.application.deauthorized'){
      // console.log('account.application.deauthorized');

      var snapshot = await admin.firestore().collection('users').where('stripeAccountId', '==', event.account).limit(1).get();

      if (snapshot.size > 0){
        var userRef = snapshot.docs[0].ref;
        var account = await stripe.accounts.retrieve(event.account);
        await userRef.update({ stripeOnboardingStatus: 'Deauthorized', lastUpdateDate: FieldValue.serverTimestamp() });
      }
      return res.json({ received: true });
    }
    else if (event.type == 'account.updated'){
      // console.log('account.updated');

      var snapshot = await admin.firestore().collection('users').where('stripeAccountId', '==', event.account).limit(1).get();

      if (snapshot.size > 0){
        var userRef = snapshot.docs[0].ref;
        var account = await stripe.accounts.retrieve(event.account);
        await userRef.update({ stripeOnboardingStatus: account.charges_enabled ? 'Authorized' : 'Pending', stripeCurrency: account.default_currency, lastUpdateDate: FieldValue.serverTimestamp() });
        await updateUserServices(snapshot.docs[0].data().uid, account.default_currency);
      }
      return res.json({ received: true });
    }
    else if (event.type == 'payment_intent.created'){
      // console.log('payment_intent.created');

      var paymentIntent = event.data.object;
      var metadata = paymentIntent.metadata; // { userId: userId, paymentId: paymentId }

      // customer making this payment
      var paymentSnapshot = await admin.firestore().collection(`users/${metadata.buyerUserId}/payments`).doc(metadata.paymentId).get();
      var paymentRef = paymentSnapshot.ref;
      var payment = paymentSnapshot.data();

      if (paymentSnapshot.exists){
        // create receipt
        // Set receiptId and change status to pending to inform user we have received their payment
        await paymentRef.update({ status: 'Pending', lastUpdateDate: FieldValue.serverTimestamp() });
        await admin.firestore().collection(`users/${payment.sellerUid}/receipts`).doc(payment.receiptId).set({
          receiptId: payment.receiptId,
          uid: payment.sellerUid,
          paymentId: payment.paymentId,
          amount: payment.amount,
          currency: payment.currency,
          quantity: payment.quantity,
          status: 'Pending',
          buyerUid: payment.buyerUid,
          buyerServiceId: payment.buyerServiceId,
          buyerEmail: payment.buyerEmail,
          sellerUid: payment.sellerUid,
          sellerServiceId: payment.sellerServiceId,
          sellerEmail: payment.sellerEmail,
          paymentIntentId: payment.paymentIntentId,
          lastUpdateDate: FieldValue.serverTimestamp(),
          creationDate: FieldValue.serverTimestamp()
        });
      }
      return res.json({ received: true });
    }
    else if (event.type == 'payment_intent.succeeded'){
      // console.log('payment_intent.succeeded');

      var paymentIntent = event.data.object;
      var metadata = paymentIntent.metadata; // { userId: userId, paymentId: paymentId }

      // customer making this payment
      var paymentSnapshot = await admin.firestore().collection(`users/${metadata.buyerUserId}/payments`).doc(metadata.paymentId).get();
      var paymentRef = paymentSnapshot.ref;
      var payment = paymentSnapshot.data();

      if (paymentSnapshot.exists){
        // change status to pending to inform user we have received their payment and awaiting their payment
        await paymentRef.update({ status: 'Success', lastUpdateDate: FieldValue.serverTimestamp() });

        var userReceiptSnapshot = await admin.firestore().collection(`users/${payment.sellerUid}/receipts`).doc(payment.receiptId).get();
        var sellerSnapshot = await admin.firestore().collection(`users/${payment.sellerUid}/services`).doc(payment.sellerServiceId).get();

        if (userReceiptSnapshot.exists)
          await userReceiptSnapshot.ref.update({ status: 'Success', lastUpdateDate: FieldValue.serverTimestamp() });

        if (sellerSnapshot.exists){
          var sellerService = sellerSnapshot.data();

          if (sellerService.typeOfPayment == 'One-off')
            await sellerSnapshot.ref.update({ paymentId: payment.paymentId, paymentUserId: payment.uid, indexed: false, lastUpdateDate: FieldValue.serverTimestamp() });
        }
      }
      return res.json({ received: true });
    }
    else if (event.type == 'payment_intent.payment_failed'){
      // console.log('payment_intent.payment_failed');

      var paymentIntent = event.data.object;
      var metadata = paymentIntent.metadata; // { userId: userId, paymentId: paymentId }

      // customer making this payment
      var paymentSnapshot = await admin.firestore().collection(`users/${metadata.buyerUserId}/payments`).doc(metadata.paymentId).get();
      var paymentRef = paymentSnapshot.ref;
      var payment = paymentSnapshot.data();

      if (paymentSnapshot.exists){
        // change status to pending to inform user we have received their payment and awaiting their payment
        await paymentRef.update({ status: 'Failed', lastUpdateDate: FieldValue.serverTimestamp() });

        var userReceiptSnapshot = await admin.firestore().collection(`users/${payment.sellerUid}/receipts`).doc(payment.receiptId).get();

        if (userReceiptSnapshot.exists)
          await userReceiptSnapshot.ref.update({ status: 'Failed', lastUpdateDate: FieldValue.serverTimestamp() });
      }
      return res.json({ received: true });
    }
    else {
      // console.log('Unknown event.type ' + event.type);
      return res.json({ received: true });
    }
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// create and return a stripe payment intent
// https://stripe.com/docs/payments/payment-intents
// charge on behalf of connected account
// https://stripe.com/docs/payments/connected-accounts
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  const userId = context.auth.uid;
  const sellerUid = data.sellerUid;
  const sellerServiceId = data.sellerServiceId;
  const buyerUid = data.buyerUid;
  const buyerServiceId = data.buyerServiceId;

  try {
    // get seller
    const sellerSnapshot = await admin.firestore().collection('users').doc(sellerUid).get();
    const seller = sellerSnapshot.data();

    // get buyer
    const buyerSnapshot = await admin.firestore().collection('users').doc(buyerUid).get();
    const buyer = buyerSnapshot.data();

    // get buyer service
    const buyerServiceSnapshot = await admin.firestore().collection(`users/${buyerUid}/services`).doc(buyerServiceId).get();
    const buyerService = buyerServiceSnapshot.data();

    // console.log('buyerService ' + JSON.stringify(buyerService));

    // get seller service
    const sellerServiceSnapshot = await admin.firestore().collection(`users/${sellerUid}/services`).doc(sellerServiceId).get();
    const sellerService = sellerServiceSnapshot.data();

    // console.log('sellerService ' + JSON.stringify(sellerService));

    const newPayment = {
      paymentId: uuid.v4().replace(/-/g, ''),
      uid: buyerUid,
      receiptId: uuid.v4().replace(/-/g, ''),
      amount: sellerService.amount,
      currency: sellerService.currency,
      quantity: 1,
      status: '',
      buyerUid: buyerUid,
      buyerServiceId: buyerServiceId,
      buyerEmail: buyer.email,
      sellerUid: sellerUid,
      sellerServiceId: sellerServiceId,
      sellerEmail: seller.email,
      paymentIntentId: '',
      creationDate: FieldValue.serverTimestamp(),
      lastUpdateDate: FieldValue.serverTimestamp()
    };

    console.log('newPayment ' + JSON.stringify(newPayment));

    const paymentSnapshot = await admin.firestore().collection(`users/${newPayment.uid}/payments`).doc(newPayment.paymentId).get();
    const paymentRef = paymentSnapshot.ref;
    const paymentSet = await paymentRef.set(newPayment);

    console.log('seller.stripeAccountId ' + seller.stripeAccountId);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: newPayment.amount*100,
      currency: newPayment.currency,
      payment_method_types: ["card"],
      metadata: {
        buyerUserId: newPayment.buyerUid,
        buyerServiceId: newPayment.buyerServiceId,
        buyerEmail: newPayment.buyerEmail,
        sellerUserId: newPayment.sellerUid,
        sellerServiceId: newPayment.sellerServiceId,
        sellerEmail: newPayment.sellerEmail,
        receiptId: newPayment.receiptId,
        paymentId: newPayment.paymentId }
    }, {
      stripeAccount: seller.stripeAccountId,
    });
    console.log('paymentIntent ' + JSON.stringify(paymentIntent));

    const paymentUpdate = await paymentRef.update({ paymentIntentId: paymentIntent.id });
    return Promise.resolve(paymentIntent);
  }
  catch (error) {
    return Promise.reject(error);
  }
});

// IMAGE UPLOAD

// ********************************************************************************
// onFileChange - image upload routine
// This event is called after the upload event from the client storage API
// let storageRef = firebase.storage().ref();
// let uploadTask = storageRef.child(storageFilePath).put(upload.file);
// ********************************************************************************
exports.onFileChange = functions.storage.object().onFinalize(object => {
  const bucket = object.bucket;
  const destBucket = gcs.bucket(bucket);
  const contentType = object.contentType;
  const filePath = object.name;

  let fileItems = filePath.split('/');
  let userId = fileItems[1];
  let id = fileItems[2].split('_')[0];

  let tinyOutputFileName = `users/${userId}/tiny_${id}.jpg`;
  let thumbOutputFileName = `users/${userId}/thumb_${id}.jpg`;
  let mediumOutputFileName = `users/${userId}/medium_${id}.jpg`;
  let largeOutputFileName = `users/${userId}/large_${id}.jpg`;

  let tinyTempOutputFileName = `${userId}_${id}_tiny.jpg`;
  let thumbTempOutputFileName = `${userId}_${id}_thumb.jpg`;
  let mediumTempOutputFileName = `${userId}_${id}_medium.jpg`;
  let largeTempOutputFileName = `${userId}_${id}_large.jpg`;

	if (object.resourceState === 'not_exists') {
		console.log('We deleted a file, exit...');
		return null;
	}

	if (!contentType.startsWith('image/')) {
		console.log('This is not an image.');
		return null;
	}

	if (path.basename(filePath).startsWith('tiny_')) {
		console.log('Image is already a tiny');
		return null;
	}

	if (path.basename(filePath).startsWith('thumb_')) {
		console.log('Image is already a thumbnail');
		return null;
	}

	if (path.basename(filePath).startsWith('medium_')) {
		console.log('Image is already medium');
		return null;
	}

	if (path.basename(filePath).startsWith('large_')) {
		console.log('Image is already large');
		return null;
	}

	var createTiny = function () {
		return new Promise((resolve, reject) => {
			const tinyFilePath = path.join(os.tmpdir(), tinyTempOutputFileName);

			destBucket.file(filePath).download({
				destination: tinyFilePath
			}).then(() => {
				return spawn('convert', [tinyFilePath, '-resize', '20x20', tinyFilePath]);
			}).then(() => {
				return destBucket.upload(tinyFilePath, {
					destination: tinyOutputFileName,
					metadata: { contentType: 'image/jpeg' }
				});
			}).then(() => {
				fs.unlinkSync(tinyFilePath);
				resolve();
			}).catch(error => {
				reject(error);
			});
		});
	};

	var createThumbnail = function () {
		return new Promise((resolve, reject) => {
			const thumbnailFilePath = path.join(os.tmpdir(), thumbTempOutputFileName);

			destBucket.file(filePath).download({
				destination: thumbnailFilePath
			}).then(() => {
				return spawn('convert', [thumbnailFilePath, '-resize', '64x64', thumbnailFilePath]);
			}).then(() => {
				return destBucket.upload(thumbnailFilePath, {
					destination: thumbOutputFileName,
					metadata: { contentType: 'image/jpeg' }
				});
			}).then(() => {
				fs.unlinkSync(thumbnailFilePath);
				resolve();
			}).catch(error => {
				reject(error);
			});
		});
	};

	var createMedium = function () {
		return new Promise((resolve, reject) => {
			const mediumFilePath = path.join(os.tmpdir(), mediumTempOutputFileName);

			destBucket.file(filePath).download({
				destination: mediumFilePath
			}).then(() => {
				return spawn('convert', [mediumFilePath, '-resize', '256x256', mediumFilePath]);
			}).then(() => {
				return destBucket.upload(mediumFilePath, {
					destination: mediumOutputFileName,
					metadata: { contentType: 'image/jpeg' }
				});
			}).then(() => {
				fs.unlinkSync(mediumFilePath);
				resolve();
			}).catch(error => {
				reject(error);
			});
		});
	};

	var createLarge = function () {
		return new Promise((resolve, reject) => {
			const largeFilePath = path.join(os.tmpdir(), largeTempOutputFileName);

			destBucket.file(filePath).download({
				destination: largeFilePath
			}).then(() => {
				return spawn('convert', [largeFilePath, '-resize', '1024x1024', largeFilePath]);
			}).then(() => {
				return destBucket.upload(largeFilePath, {
					destination: largeOutputFileName,
					metadata: { contentType: 'image/jpeg' }
				});
			}).then(() => {
				fs.unlinkSync(largeFilePath);
				resolve();
			}).catch(error => {
				reject(error);
			});
		});
  };

  var createImages = function () {
    return new Promise((resolve, reject) => {
      async.parallel([
        function (callback) {
          createTiny().then(() => {
            callback(null, null);
          })
          .catch(error => {
            callback(error);
          });
        },
        function (callback){
          createThumbnail().then(() => {
            callback(null, null);
          })
          .catch(error => {
            callback(error);
          });
        },
        function (callback){
          createMedium().then(() => {
            callback(null, null);
          })
          .catch(error => {
            callback(error);
          });
        },
        function (callback){
          createLarge().then(() => {
            callback(null, null);
          })
          .catch(error => {
            callback(error);
          });
        }],
        // optional callback
        function (error, results) {
          if (!error)
            resolve()
          else
            reject(error);
        }
      );
    });
  };

	return createImages().then(() => {
		return Promise.resolve();
	})
	.catch(error =>{
		return Promise.reject(error);
	});
});

// USER

// ********************************************************************************
// createUser
// ********************************************************************************
exports.createUser = functions.firestore.document("users/{userId}").onCreate((snap, context) => {
	var user = snap.data();
	var userId = context.params.userId;

	var createUserTotals = function () {
		return new Promise((resolve, reject) => {
			admin.database().ref('totals').child(userId).set({
				activityCount: 0, // number of activities this user is serving in
				forumCount: 0, // number of forums this user has created
				serviceCount: 0, // number of services this user has created
				notificationCount: 0, // number of notifications this user has created
				imageCount: 0, // number of images this user has uploaded
				forumNotificationCount: 0, // number of forum notifications this user has created
				serviceNotificationCount: 0, // number of service notifications this user has created
				tagCount: 0, // number of tags this user has created
				alertCount: 0, // number of alerts this user has received
				forumAlertCount: 0, // number of forum alerts this user has received
				serviceAlertCount: 0, // number of service alerts this user has received
				forumBlockCount: 0, // number of forums this user has blocked
				serviceBlockCount: 0, // number of services this user has blocked
				forumUserBlockCount: 0, // number of forum users this user has blocked
        serviceUserBlockCount: 0, // number of service users this user has blocked
        paymentCount: 0, // number of payments this user has created
        receiptCount: 0, // number of payments this user has received
        paymentAmount: 0, // total payments this user has created
        receiptAmount: 0 // total payments this user has received
			})
			.then(() => {
				resolve();
			})
			.catch(error => {
				reject(error);
			});
		});
  };

  var createCustomer = function () {
    return new Promise((resolve, reject) => {
      stripe.customers.create({
        email: user.email,
        metadata: { userId: userId }
      })
      .then(customer => {
        admin.firestore().collection("users").doc(userId).get().then(doc => {
          if (doc.exists){
            doc.ref.update({
              stripeCustomerId: customer.id,
              lastUpdateDate: FieldValue.serverTimestamp()
            }).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          }
          else resolve();
        })
        .catch(error => {
          reject(error);
        });
      })
      .catch(error => {
        reject(error);
      });
    });
  };

	return admin.firestore().collection('users').select()
		.get().then(snapshot => {
			return admin.database().ref("totals").child('user').once("value", totalSnapshot => {
				if (totalSnapshot.exists())
					return admin.database().ref("totals").child('user').update({ count: snapshot.size });
				else
					return Promise.resolve();
			});
		}
	).then(() => {
		return createUserTotals().then(() => {
			return createCustomer().then(() => {
        return Promise.resolve();
      })
      .catch(error => {
        return Promise.reject(error);
      });
		})
		.catch(error => {
			return Promise.reject(error);
		});
	})
	.catch(error => {
		return Promise.reject(error);
	});
});

// ********************************************************************************
// deleteUser
// ********************************************************************************
exports.deleteUser = functions.firestore.document("users/{userId}").onDelete(async (snap, context) => {
	var user = snap.data();
  var userId = context.params.userId;

  // collections to delete:
  // users/{userId}/payments/{paymentId}
  // users/{userId}/receipts/{receiptId}
  // users/{userId}/images/{imageId}
  // users/{userId}/tags/{tagId}
  // users/{userId}/services/{serviceId}
  // users/{userId}/forumblocks/{forumBlockId}
  // users/{parentUserId}/forumuserblocks/{forumUserBlockId}
  // users/{userId}/forums/{forumId}
  // users/{userId}/serviceblocks/{serviceBlockId}
  // users/{parentUserId}/serviceuserblocks/{serviceUserBlockId}

  var removeUserTotals = async function () {
    try {
      return await admin.database().ref('totals').child(userId).remove();
    } catch (error) {
      throw error;
    }
  };

  var deleteCustomer = async function () {
    try {
      if (user.stripeCustomerId)
        await stripe.customers.del(user.stripeCustomerId);

      return;
    } catch (error) {
      throw error;
    }
  };

  var deletePayments = async function () {
    try {
      const paymentSnapshot = await admin.firestore().collection(`users/${userId}/payments`).get();

      if (paymentSnapshot.size > 0){
        return await Promise.all(
          paymentSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var deleteReceipts = async function () {
    try {
      const receiptSnapshot = await admin.firestore().collection(`users/${userId}/receipts`).get();

      if (receiptSnapshot.size > 0){
        return await Promise.all(
          receiptSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var deleteImages = async function () {
    try {
      const imageSnapshot = await admin.firestore().collection(`users/${userId}/images`).get();

      if (imageSnapshot.size > 0){
        return await Promise.all(
          imageSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var deleteTags = async function () {
    try {
      const tagSnapshot = await admin.firestore().collection(`users/${userId}/tags`).get();

      if (tagSnapshot.size > 0){
        return await Promise.all(
          tagSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var deleteServices = async function () {
    try {
      const serviceSnapshot = await admin.firestore().collection(`users/${userId}/services`).get();

      if (serviceSnapshot.size > 0){
        return await Promise.all(
          serviceSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var deleteForums = async function () {
    try {
      const forumSnapshot = await admin.firestore().collection(`users/${userId}/forums`).get();

      if (forumSnapshot.size > 0){
        return await Promise.all(
          forumSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var forumBlocks = async function () {
    try {
      const forumBlockSnapshot = await admin.firestore().collection(`users/${userId}/forumblocks`).get();

      if (forumBlockSnapshot.size > 0){
        return await Promise.all(
          forumBlockSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var forumUserBlocks = async function () {
    try {
      const forumUserBlockSnapshot = await admin.firestore().collection(`users/${userId}/forumuserblocks`).get();

      if (forumUserBlockSnapshot.size > 0){
        return await Promise.all(
          forumUserBlockSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var serviceBlocks = async function () {
    try {
      const serviceBlockSnapshot = await admin.firestore().collection(`users/${userId}/serviceblocks`).get();

      if (serviceBlockSnapshot.size > 0){
        return await Promise.all(
          serviceBlockSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var serviceUserBlocks = async function () {
    try {
      const serviceUserBlockSnapshot = await admin.firestore().collection(`users/${userId}/serviceuserblocks`).get();

      if (serviceUserBlockSnapshot.size > 0){
        return await Promise.all(
          serviceUserBlockSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  try {
    const userSnapshot = await admin.firestore().collection('users').select().get();
    const totalSnapshot = await admin.database().ref("totals").child('user').once("value");

    if (totalSnapshot.exists())
      await admin.database().ref("totals").child('user').update({ count: userSnapshot.size });

    await deleteForums();
    await deleteServices();
    await forumBlocks();
    await forumUserBlocks();
    await serviceBlocks();
    await serviceUserBlocks();
    await deletePayments();
    await deleteReceipts();
    await deleteCustomer();
    await deleteImages();
    await deleteTags();
    return await removeUserTotals();
  }
  catch (error) {
    return Promise.reject(error);
  }
});

// ********************************************************************************
// createUserPayment
// ********************************************************************************
exports.createUserPayment = functions.firestore.document("users/{userId}/payments/{paymentId}").onCreate(async (snap, context) => {
  const payment = snap.data();
  const userId = context.params.userId;
  const paymentId = context.params.paymentId;

  try {
    const paymentSnapshot = await admin.firestore().collection(`users/${userId}/payments`).select().get();
    const totalSnapshot = await admin.database().ref("totals").child(userId).once("value");

    if (totalSnapshot.exists())
      return await admin.database().ref("totals").child(userId).update({ paymentCount: paymentSnapshot.size });
    else
      return;
  }
  catch (error) {
    return Promise.reject(error);
  }
});

// ********************************************************************************
// deleteUserPayment
// ********************************************************************************
exports.deleteUserPayment = functions.firestore.document("users/{userId}/payments/{paymentId}").onDelete(async (snap, context) => {
  const payment = snap.data();
  const userId = context.params.userId;
  const paymentId = context.params.paymentId;

  try {
    const paymentSnapshot = await admin.firestore().collection(`users/${userId}/payments`).select().get();
    const totalSnapshot = await admin.database().ref("totals").child(userId).once("value");

    if (totalSnapshot.exists())
      return await admin.database().ref("totals").child(userId).update({ paymentCount: paymentSnapshot.size });
    else
      return;
  }
  catch (error) {
    return Promise.reject(error);
  }
});

// ********************************************************************************
// createUserReceipt
// ********************************************************************************
exports.createUserReceipt = functions.firestore.document("users/{userId}/receipts/{receiptId}").onCreate((snap, context) => {
  var receipt = snap.data();
  var userId = context.params.userId;
  var receiptId = context.params.receiptId;

  return admin.firestore().collection(`users/${userId}/receipts`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(userId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(userId).update({ receiptCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ********************************************************************************
// deleteUserReceipt
// ********************************************************************************
exports.deleteUserReceipt = functions.firestore.document("users/{userId}/receipts/{receiptId}").onDelete((snap, context) => {
  var receipt = snap.data();
  var userId = context.params.userId;
  var receiptId = context.params.receiptId;

  return admin.firestore().collection(`users/${userId}/receipts`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(userId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(userId).update({ receiptCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ACTIVITY

// ********************************************************************************
// createUserActivity
// ********************************************************************************
exports.createUserActivity = functions.firestore.document("users/{userId}/activities/{activityId}").onCreate((snap, context) => {
  var activity = snap.data();
  var userId = context.params.userId;
  var activityId = context.params.activityId;

  return admin.firestore().collection(`users/${userId}/activities`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(userId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(userId).update({ activityCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ********************************************************************************
// deleteUserActivity
// ********************************************************************************
exports.deleteUserActivity = functions.firestore.document("users/{userId}/activities/{activityId}").onDelete((snap, context) => {
  var activity = snap.data();
  var userId = context.params.userId;
  var activityId = context.params.activityId;

  return admin.firestore().collection(`users/${userId}/activities`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(userId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(userId).update({ activityCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    // remove the child registrants associated with this activity
    var registrantActivityRef = admin.firestore().collection(`users/${userId}/activities/${activity.forumId}/registrants`);

    registrantActivityRef.get().then(snapshot => {
      if (snapshot.size > 0){
        var promises = snapshot.docs.map(doc => {
          return new Promise((resolve, reject) => {
            doc.ref.delete().then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          });
        });

        Promise.all(promises).then(() => {
          return Promise.resolve();
        })
        .catch(error => {
          return Promise.reject(error);
        });
      }
      else return Promise.resolve();
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteUserActivityRegistrant
// ********************************************************************************
exports.deleteUserActivityRegistrant = functions.firestore.document('users/{userId}/activities/{forumId}/registrants/{registrantId}').onDelete((snap, context) => {
  var registrant = snap.data();
  var userId = context.params.userId;
  var forumId = context.params.forumId;
  var registrantId = context.params.registrantId;

  var removeActivity = function () {
    return new Promise((resolve, reject) => {
      var activityRef = admin.firestore().collection(`users/${userId}/activities`).doc(forumId);

      activityRef.get().then(doc => {
        if (doc.exists){
          var registrantActivityRef = admin.firestore().collection(`users/${userId}/activities/${forumId}/registrants`);

          registrantActivityRef.get().then(snapshot => {
            if (snapshot.size == 0){
              activityRef.delete().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  return removeActivity().then(() => {
    return Promise.resolve();
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// IMAGE

// ********************************************************************************
// createUserImage
// ********************************************************************************
exports.createUserImage = functions.firestore.document("users/{userId}/images/{imageId}").onCreate((snap, context) => {
	var image = snap.data();
	var userId = context.params.userId;
	var imageId = context.params.imageId;

	var createImageTotals = function () {
		return new Promise((resolve, reject) => {
			admin.database().ref('totals').child(imageId).set({
				forumCount: 0,
				serviceCount: 0,
				postCount: 0
			})
			.then(() => {
				resolve();
			})
			.catch(error => {
				reject(error);
			});
		});
	};

	return admin.firestore().collection(`users/${userId}/images`).select()
		.get().then(snapshot => {
			return admin.database().ref("totals").child(userId).once("value", totalSnapshot => {
				if (totalSnapshot.exists())
					return admin.database().ref("totals").child(userId).update({ imageCount: snapshot.size });
				else
					return Promise.resolve();
			});
		}
	).then(() => {
		return createImageTotals().then(() => {
			return Promise.resolve();
		})
		.catch(error => {
			return Promise.reject(error);
		});
	})
	.catch(error => {
		return Promise.reject(error);
	});
});

// ********************************************************************************
// updateUserImage
// ********************************************************************************
exports.updateUserImage = functions.firestore.document("users/{userId}/images/{imageId}").onUpdate((change, context) => {
	var newValue = change.after.data();
	var previousValue = change.before.data();
	var userId = context.params.userId;
	var imageId = context.params.imageId;

	var updateUserForumImages = function() {
		return new Promise((resolve, reject) => {
			admin.firestore().collection(`users/${userId}/images/${imageId}/forums`).get().then(snapshot => {
				var promises = snapshot.docs.map(doc => {
				  return new Promise((resolve, reject) => {
					  var forum = doc.data();
					  var forumImageRef = admin.firestore().collection(`users/${userId}/forums/${forum.forumId}/images`).doc(imageId);

            forumImageRef.get().then(doc => {
              if (doc.exists){
                doc.ref.update({
                  name: newValue.name,
									lastUpdateDate: newValue.lastUpdateDate
                })
                .then(() => {
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              }
              else resolve();
            })
            .catch(error => {
              reject(error);
            });
          });
				});

				Promise.all(promises).then(() => {
					resolve();
				})
				.catch(error => {
					reject(error);
				});
			}).catch(error =>{
        reject(error);
      });
		});
	};

	var updateUserServiceImages = function () {
		return new Promise((resolve, reject) => {
			admin.firestore().collection(`users/${userId}/images/${imageId}/services`).get().then(snapshot => {
				var promises = snapshot.docs.map(doc => {
					return new Promise((resolve, reject) => {
						var service = doc.data();
						var serviceImageRef = admin.firestore().collection(`users/${userId}/services/${service.serviceId}/images`).doc(imageId);

						serviceImageRef.get().then(doc => {
							if (doc.exists){
								doc.ref.update({
									name: newValue.name,
									lastUpdateDate: newValue.lastUpdateDate
								})
								.then(() => {
									resolve();
								})
								.catch(error => {
									reject(error);
								});
							}
							else resolve();
						})
						.catch(error => {
							reject(error);
						});
					});
				});

				Promise.all(promises).then(() => {
					resolve();
				})
				.catch(error => {
					reject(error);
				});
      })
      .catch(error => {
        reject(error);
      });
		});
  };

  return updateUserForumImages().then(() => {
    return updateUserServiceImages().then(() => {
      return Promise.resolve();
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteUserImage
// ********************************************************************************
exports.deleteUserImage = functions.firestore.document("users/{userId}/images/{imageId}").onDelete((snap, context) => {
	var image = snap.data();
	var userId = context.params.userId;
	var imageId = context.params.imageId;
	var bucket = admin.storage().bucket();

	var removeImageTotals = function () {
		return new Promise((resolve, reject) => {
			admin.database().ref('totals').child(imageId).remove(() => {
				resolve();
			})
			.catch(error => {
				reject(error);
			});
		});
	};

	var removeUserForumImages = function () {
		return new Promise((resolve, reject) => {
			admin.firestore().collection(`users/${userId}/images/${imageId}/forums`).get().then(snapshot => {
				var promises = snapshot.docs.map(doc => {
					return new Promise((resolve, reject) => {
						var forum = doc.data();
						var forumImageRef = admin.firestore().collection(`users/${userId}/forums/${forum.forumId}/images`).doc(imageId);

						forumImageRef.get().then(doc => {
							if (doc.exists){
								doc.ref.delete().then(() => {
									resolve();
								})
								.catch(error => {
									reject(error);
								});
							}
							else resolve();
						})
						.catch(error => {
							reject(error);
						});
					});
				});

				Promise.all(promises).then(() => {
					resolve();
				})
				.catch(error => {
					reject(error);
				});
			});
		});
	};

	var removeUserServiceImages = function () {
		return new Promise((resolve, reject) => {
			admin.firestore().collection(`users/${userId}/images/${imageId}/services`).get().then(snapshot => {
				var promises = snapshot.docs.map(doc => {
					return new Promise((resolve, reject) => {
						var service = doc.data();
						var serviceImageRef = admin.firestore().collection(`users/${userId}/services/${service.serviceId}/images`).doc(imageId);

						serviceImageRef.get().then(doc => {
							if (doc.exists){
								doc.ref.delete().then(() => {
									resolve();
								})
								.catch(error => {
									reject(error);
								});
							}
							else resolve();
						})
						.catch(error => {
							reject(error);
						});
					});
				});

				Promise.all(promises).then(() => {
					resolve();
				})
				.catch(error => {
					reject(error);
				});
			});
		});
	};

	var removeImage = function (path){
		return new Promise((resolve, reject) => {
			bucket.file(path).exists().then(exists => {
				if (exists){
					bucket.file(path).delete().then(() => {
						resolve();
					})
					.catch(error => {
						reject(error);
					});
				}
				else resolve();
			})
			.catch(error => {
				reject(error);
			});
		});
	};

	return admin.firestore().collection(`users/${userId}/images`).select()
		.get().then(snapshot => {
			return admin.database().ref("totals").child(userId).once("value", totalSnapshot => {
				if (totalSnapshot.exists())
					return admin.database().ref("totals").child(userId).update({ imageCount: snapshot.size });
				else
					return Promise.resolve();
			});
		}
	).then(() => {
    return removeUserForumImages().then(() => {
      return removeUserServiceImages().then(() => {
        return removeImage(image.filePath).then(() => {
          return removeImage(image.largeUrl).then(() => {
            return removeImage(image.mediumUrl).then(() => {
              return removeImage(image.smallUrl).then(() => {
                return removeImage(image.tinyUrl).then(() => {
                  return removeImageTotals().then(() => {
                    return Promise.resolve();
                  })
                  .catch(error => {
                    return Promise.reject(error);
                  });
                })
                .catch(error => {
                  return Promise.reject(error);
                })
              })
              .catch(error => {
                return Promise.reject(error);
              })
            })
            .catch(error => {
              return Promise.reject(error);
            })
          })
          .catch(error => {
            return Promise.reject(error);
          })
        })
        .catch(error => {
          return Promise.reject(error);
        });
      })
      .catch(error => {
        return Promise.reject(error);
      });
    })
    .catch(error => {
      return Promise.reject(error);
    });
	})
	.catch(error => {
		return Promise.reject(error);
	});
});

// TAG

// ********************************************************************************
// createUserTag
// ********************************************************************************
exports.createUserTag = functions.firestore.document("users/{userId}/tags/{tagId}").onCreate((snap, context) => {
  var tag = snap.data();
  var userId = context.params.userId;
  var tagId = context.params.tagId;

  var createPublicTag = function () {
    return new Promise((resolve, reject) => {
      var tagRef = admin.firestore().collection('tags').doc(tagId);
      tagRef.set(tag).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/tags`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(userId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(userId).update({ tagCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return createPublicTag().then(() => {
      return Promise.resolve();
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteUserTag
// ********************************************************************************
exports.deleteUserTag = functions.firestore.document("users/{userId}/tags/{tagId}").onDelete((snap, context) => {
  var tag = snap.data();
  var userId = context.params.userId;
  var tagId = context.params.tagId;

  var removePublicTag = function () {
    return new Promise((resolve, reject) => {
      admin.database().ref("totals").child(tagId).once("value", totalSnapshot => {
        if (totalSnapshot.exists()){
          let total = totalSnapshot.val();

          // do not remove the tag if it is being used by other forums or services
          if (total.forumCount == 0 && total.serviceCount == 0){
            var tagRef = admin.firestore().collection('tags').doc(tagId);
            tagRef.get().then(doc => {
              if (doc.exists){
                doc.ref.delete().then(() => {
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              }
              else resolve();
            })
            .catch(error => {
              reject(error);
            });
          }
          else {
            console.log(`Cannot remove tag it is being used by forumCount: ${total.forumCount} serviceCount: ${total.serviceCount}`);
            resolve();
          }
        }
        else resolve();
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/tags`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(userId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(userId).update({ tagCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return removePublicTag().then(() => {
      return Promise.resolve();
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    reject(error);
  });
});

// TAG CHILDREN

// ********************************************************************************
// createUserTagService
// ********************************************************************************
exports.createUserTagService = functions.firestore.document("users/{userId}/tags/{tagId}/services/{serviceId}").onCreate((snap, context) => {
  var service = snap.data();
	var userId = context.params.userId;
	var tagId = context.params.tagId;
  var serviceId = context.params.serviceId;

  return admin.firestore().collection(`users/${userId}/tags/${tagId}/services`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(tagId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(tagId).update({ serviceCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ********************************************************************************
// deleteUserTagService
// ********************************************************************************
exports.deleteUserTagService = functions.firestore.document("users/{userId}/tags/{tagId}/services/{serviceId}").onDelete((snap, context) => {
  var service = snap.data();
  var userId = context.params.userId;
  var tagId = context.params.tagId;
  var serviceId = context.params.serviceId;

  return admin.firestore().collection(`users/${userId}/tags/${tagId}/services`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(tagId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(tagId).update({ serviceCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ********************************************************************************
// createUserTagForum
// ********************************************************************************
exports.createUserTagForum = functions.firestore.document("users/{userId}/tags/{tagId}/forums/{forumId}").onCreate((snap, context) => {
  var forum = snap.data();
  var userId = context.params.userId;
  var tagId = context.params.tagId;
  var forumId = context.params.forumId;

  return admin.firestore().collection(`users/${userId}/tags/${tagId}/forums`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(tagId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(tagId).update({ forumCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ********************************************************************************
// deleteUserTagForum
// ********************************************************************************
exports.deleteUserTagForum = functions.firestore.document("users/{userId}/tags/{tagId}/forums/{forumId}").onDelete((snap, context) => {
  var forum = snap.data();
  var userId = context.params.userId;
  var tagId = context.params.tagId;
  var forumId = context.params.forumId;

  return admin.firestore().collection(`users/${userId}/tags/${tagId}/forums`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(tagId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(tagId).update({ forumCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// SERVICE

// ********************************************************************************
// createUserService
// ********************************************************************************
exports.createUserService = functions.firestore.document("users/{userId}/services/{serviceId}").onCreate((snap, context) => {
  var service = snap.data();
  var serviceId = context.params.serviceId;
  var userId = context.params.userId;

  var createServiceTotals = function () {
    return new Promise((resolve, reject) => {
      admin.database().ref('totals').child(serviceId).set({
        forumCount: 0,
        tagCount: 0,
        imageCount: 0,
        rateAverage: 0,
        rateCount: 0,
        reviewCount: 0,
        createdReviewCount: 0,
        createdRateCount: 0,
        createdCommentCount: 0
      })
      .then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var addToUserServiceNoTags = function () {
    return new Promise((resolve, reject) => {
      var serviceRef = admin.firestore().collection(`users/${userId}/servicesnotags`).doc(serviceId);
      serviceRef.set(service).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var addToPublicServiceNoTags = function () {
    return new Promise((resolve, reject) => {
      var serviceRef = admin.firestore().collection('servicesnotags').doc(serviceId);
      serviceRef.set(service).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var addToAnonymousServiceNoTags = function () {
    return new Promise((resolve, reject) => {
      var serviceRef = admin.firestore().collection('anonymousservicesnotags').doc(serviceId);
      serviceRef.set(service).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var createPublicService = function () {
    return new Promise((resolve, reject) => {
      var serviceRef = admin.firestore().collection('services').doc(serviceId);
      serviceRef.set(service).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var createAnonymousService = function () {
    return new Promise((resolve, reject) => {
      var anonymousServiceRef = admin.firestore().collection('anonymousservices').doc(serviceId);
      anonymousServiceRef.set(service).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/services`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(userId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(userId).update({ serviceCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return createServiceTotals().then(() => {
      return addToUserServiceNoTags().then(() => {
				if (service.indexed == true && service.type == 'Public'){
					return createPublicService().then(() => {
						return createAnonymousService().then(() => {
              return addToPublicServiceNoTags().then(() => {
                return addToAnonymousServiceNoTags().then(() => {
                  return Promise.resolve();
                })
                .catch(error => {
                  return Promise.reject(error);
                });
              })
              .catch(error => {
                return Promise.reject(error);
              });
            })
            .catch(error => {
              return Promise.reject(error);
            });
					})
					.catch(error => {
						return Promise.reject(error);
					});
				}
				else return Promise.resolve();
			})
			.catch(error => {
				return Promise.reject(error);
			});
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// updateUserService
// ********************************************************************************
exports.updateUserService = functions.firestore.document("users/{userId}/services/{serviceId}").onUpdate((change, context) => {
  var newValue = change.after.data();
	var previousValue = change.before.data();
	var userId = context.params.userId;
  var serviceId = context.params.serviceId;

  var updateUserCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
        var promises = collectionTitles.map(collectionTitle => {
          return new Promise((resolve, reject) => {
            admin.firestore().collection(`users/${userId}/servicescollection/${collectionTitle}/services`).doc(serviceId).get().then(doc => {
              if (doc.exists){
                doc.ref.update(newValue).then(() => {
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              }
              else resolve();
            })
            .catch(error => {
              reject(error);
            });
          });
        });

        Promise.all(promises).then(() => {
          resolve();
        })
        .catch(error => {
          reject(error);
        });
      });
    });
  };

  var addToUserNoTags = function () {
    return new Promise((resolve, reject) => {
      var serviceRef = admin.firestore().collection(`users/${userId}/servicesnotags`).doc(serviceId);
      serviceRef.set(newValue).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var removeUserNoTags = function () {
    return new Promise((resolve, reject) => {
      var serviceRef = admin.firestore().collection(`users/${userId}/servicesnotags`).doc(serviceId);
      serviceRef.get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      });
    });
  };

  var updateUserService = function (tags) {
    return new Promise((resolve, reject) => {
      if (tags && tags.length > 0){
        removeUserNoTags().then(() => {
          updateUserCollectionTitles(tags).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        })
        .catch(error => {
          reject(error);
        });
      }
      else {
        addToUserNoTags().then(() => {
          resolve();
        })
        .catch(error => {
          reject(error);
        });
      }
    });
  };

  // CERT (Community, Engagement, Retention, Trust) Ranking System
  // Put public services into CERT collections 1,2,3,4,5
  // admin.firestore().collection(`cert${user.certification}/servicescollection/${collectionTitle}/services`).doc(serviceId).get()
  // don't put anonymous into CERT collections

  var createOrUpdatePublicService = function (tags) {
    return new Promise((resolve, reject) => {
      var createPublicServiceCollectionTitles = function (tags) {
        return new Promise((resolve, reject) => {
          tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
            var promises = collectionTitles.map(collectionTitle => {
              return new Promise((resolve, reject) => {
                admin.firestore().collection(`servicescollection/${collectionTitle}/services`).doc(serviceId).get().then(doc => {
                  if (doc.exists){
                    doc.ref.update(newValue).then(() => {
                      resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  }
                  else {
                    doc.ref.create(newValue).then(() => {
                      resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  }
                })
                .catch(error => {
                  reject(error);
                });
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          });
        });
      };

      var updatePublicServiceCollectionTitles = function (tags) {
        return new Promise((resolve, reject) => {
          tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
            var promises = collectionTitles.map(collectionTitle => {
              return new Promise((resolve, reject) => {
                admin.firestore().collection(`servicescollection/${collectionTitle}/services`).doc(serviceId).get().then(doc => {
                  if (doc.exists){
                    doc.ref.update(newValue).then(() => {
                      resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  }
                  else {
                    doc.ref.create(newValue).then(() => {
                      resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  }
                })
                .catch(error => {
                  reject(error);
                });
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          });
        });
      };

      var addToPublicServiceNoTags = function () {
        return new Promise((resolve, reject) => {
          var serviceRef = admin.firestore().collection('servicesnotags').doc(serviceId);
          serviceRef.set(newValue).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      };

      var removePublicServiceNoTags = function () {
        return new Promise((resolve, reject) => {
          var serviceRef = admin.firestore().collection('servicesnotags').doc(serviceId);
          serviceRef.get().then(doc => {
            if (doc.exists){
              doc.ref.delete().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else resolve();
          });
        });
      };

      admin.firestore().collection('services').doc(serviceId).get().then(doc => {
        if (doc.exists){
          doc.ref.update(newValue).then(() => {
            if (tags && tags.length > 0) {
              removePublicServiceNoTags().then(() => {
                updatePublicServiceCollectionTitles(tags).then(() => {
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              })
              .catch(error => {
                reject(error);
              });
            }
            else {
              addToPublicServiceNoTags().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
          })
          .catch(error => {
            reject(error);
          });
        }
        else {
          var serviceRef = admin.firestore().collection('services').doc(serviceId);
          serviceRef.set(newValue).then(() => {
            if (tags && tags.length > 0){
              createPublicServiceCollectionTitles(tags).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else {
              addToPublicServiceNoTags().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
          })
          .catch(error => {
            reject(error);
          });
        }
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var createOrUpdateAnonymousService = function (tags) {
    return new Promise((resolve, reject) => {
      var createAnonymousServiceCollectionTitles = function (tags) {
        return new Promise((resolve, reject) => {
          tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
            var promises = collectionTitles.map(collectionTitle => {
              return new Promise((resolve, reject) => {
                admin.firestore().collection(`anonymousservicescollection/${collectionTitle}/services`).doc(serviceId).get().then(doc => {
                  if (doc.exists){
                    doc.ref.update(newValue).then(() => {
                      resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  }
                  else {
                    doc.ref.create(newValue).then(() => {
                      resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  }
                })
                .catch(error => {
                  reject(error);
                });
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          });
        });
      };

      var updateAnonymousServiceCollectionTitles = function (tags) {
        return new Promise((resolve, reject) => {
          tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
            var promises = collectionTitles.map(collectionTitle => {
              return new Promise((resolve, reject) => {
                admin.firestore().collection(`anonymousservicescollection/${collectionTitle}/services`).doc(serviceId).get().then(doc => {
                  if (doc.exists){
                    doc.ref.update(newValue).then(() => {
                      resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  }
                  else {
                    doc.ref.create(newValue).then(() => {
                      resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  }
                })
                .catch(error => {
                  reject(error);
                });
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          });
        });
      };

      var addToAnonymousServiceNoTags = function () {
        return new Promise((resolve, reject) => {
          var serviceRef = admin.firestore().collection('anonymousservicesnotags').doc(serviceId);
          serviceRef.set(newValue).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      };

      var removeAnonymousServiceNoTags = function () {
        return new Promise((resolve, reject) => {
          var serviceRef = admin.firestore().collection('anonymousservicesnotags').doc(serviceId);
          serviceRef.get().then(doc => {
            if (doc.exists){
              doc.ref.delete().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else resolve();
          });
        });
      };

      admin.firestore().collection('anonymousservices').doc(serviceId).get().then(doc => {
        if (doc.exists){
          doc.ref.update(newValue).then(() => {
            if (tags && tags.length > 0) {
              removeAnonymousServiceNoTags().then(() => {
                updateAnonymousServiceCollectionTitles(tags).then(() => {
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              })
              .catch(error => {
                reject(error);
              });
            }
            else {
              addToAnonymousServiceNoTags().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
          })
          .catch(error => {
            reject(error);
          });
        }
        else {
          var serviceRef = admin.firestore().collection('anonymousservices').doc(serviceId);
          serviceRef.set(newValue).then(() => {
            if (tags && tags.length > 0){
              createAnonymousServiceCollectionTitles(tags).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else {
              addToAnonymousServiceNoTags().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
          })
          .catch(error => {
            reject(error);
          });
        }
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var removePublicService = function (tags) {
    return new Promise((resolve, reject) => {
      var removePublicCollectionTitles = function (tags){
        return new Promise((resolve, reject) => {
          if (tags.length > 0){
            tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
              var promises = collectionTitles.map(collectionTitle => {
                return new Promise((resolve, reject) => {
                  var serviceRef = admin.firestore().collection(`servicescollection/${collectionTitle}/services`).doc(serviceId);
                  serviceRef.get().then(doc => {
                    if (doc.exists){
                      doc.ref.delete().then(() => {
                        resolve();
                      })
                      .catch(error => {
                        reject(error);
                      });
                    }
                    else resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                });
              });

              Promise.all(promises).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          }
          else resolve();
        });
      };

      var removePublicServiceNoTags = function () {
        return new Promise((resolve, reject) => {
          var serviceRef = admin.firestore().collection('servicesnotags').doc(serviceId);
          serviceRef.get().then(doc => {
            if (doc.exists){
              doc.ref.delete().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else resolve();
          });
        });
      };

      async.parallel([
        // remove service
        function (callback) {
          admin.firestore().collection('services').doc(serviceId).get().then(doc => {
            if (doc.exists){
              doc.ref.delete().then(() => {
                callback(null, null);
              })
              .catch(error => {
                callback(error);
              });
            }
            else callback(null, null);
          });
        },
        function (callback){
          if (tags.length > 0){
            removePublicCollectionTitles(tags).then(() => {
              callback(null, null);
            })
            .catch(error => {
              callback(error);
            });
          }
          else {
            removePublicServiceNoTags().then(() => {
              callback(null, null);
            })
            .catch(error => {
              callback(error);
            });
          }
        }],
        // optional callback
        function (error, results) {
          if (!error)
            resolve();
          else
            reject(error);
        }
      );
    });
  };

  var removeAnonymousService = function (tags) {
    return new Promise((resolve, reject) => {
      var removeAnonymousCollectionTitles = function (tags){
        return new Promise((resolve, reject) => {
          if (tags.length > 0){
            tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
              var promises = collectionTitles.map(collectionTitle => {
                return new Promise((resolve, reject) => {
                  var serviceRef = admin.firestore().collection(`anonymousservicescollection/${collectionTitle}/services`).doc(serviceId);
                  serviceRef.get().then(doc => {
                    if (doc.exists){
                      doc.ref.delete().then(() => {
                        resolve();
                      })
                      .catch(error => {
                        reject(error);
                      });
                    }
                    else resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                });
              });

              Promise.all(promises).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          }
          else resolve();
        });
      };

      var removeAnonymousServiceNoTags = function () {
        return new Promise((resolve, reject) => {
          var serviceRef = admin.firestore().collection('anonymousservicesnotags').doc(serviceId);
          serviceRef.get().then(doc => {
            if (doc.exists){
              doc.ref.delete().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else resolve();
          });
        });
      };

      async.parallel([
        // remove service
        function (callback) {
          admin.firestore().collection('anonymousservices').doc(serviceId).get().then(doc => {
            if (doc.exists){
              doc.ref.delete().then(() => {
                callback(null, null);
              })
              .catch(error => {
                callback(error);
              });
            }
            else callback(null, null);
          });
        },
        function (callback){
          if (tags.length > 0){
            removeAnonymousCollectionTitles(tags).then(() => {
              callback(null, null);
            })
            .catch(error => {
              callback(error);
            });
          }
          else {
            removeAnonymousServiceNoTags().then(() => {
              callback(null, null);
            })
            .catch(error => {
              callback(error);
            });
          }
        }],
        // optional callback
        function (error, results) {
          if (!error)
            resolve();
          else
            reject(error);
        }
      );
    });
  };

  var getTags = function (){
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${userId}/services/${serviceId}/tags`).get().then(snapshot => {
        var tags = [];

        if (snapshot.size > 0){
          snapshot.docs.forEach(doc => {
            tags.push(doc.data().tag);
          });
          tags.sort();
        }
        resolve(tags);
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return getTags().then(tags => {
    return updateUserService(tags).then(() => {
      if (newValue.indexed == true && newValue.type == 'Public'){
        return createOrUpdatePublicService(tags).then(() => {
          return createOrUpdateAnonymousService(tags).then(() => {
            return Promise.resolve();
          })
          .catch(error => {
            return Promise.reject(error);
          });
        })
        .catch(error => {
          return Promise.reject(error);
        });
      }
      else {
        return removePublicService(tags).then(() => {
          return removeAnonymousService(tags).then(() => {
            return Promise.resolve();
          })
          .catch(error => {
            return Promise.reject(error);
          });
        })
        .catch(error => {
          return Promise.reject(error);
        });
      }
		})
		.catch(error => {
			return Promise.reject(error);
		});
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteUserService
// ********************************************************************************
exports.deleteUserService = functions.firestore.document("users/{userId}/services/{serviceId}").onDelete(async (snap, context) => {
	var service = snap.data();
	var userId = context.params.userId;
  var serviceId = context.params.serviceId;

  var removeServiceTotals = async function () {
    try {
      return await admin.database().ref('totals').child(serviceId).remove();
    } catch (error) {
      throw error;
    }
  };

  var removeUserService = async function (tags) {
    try {
      if (tags && tags.length > 0)
        return await removeUserCollectionTitles(tags);
      else {
        return await removeUserServiceNoTags();
      }
    } catch (error) {
      throw error;
    }
  };

  var removeUserServiceNoTags = async function () {
    try {
      var serviceSnapshot = await admin.firestore().collection(`users/${userId}/servicesnotags`).doc(serviceId).get();
      var serviceRef = serviceSnapshot.ref;

      if (serviceSnapshot.exists)
        await serviceRef.delete();

      return;
    } catch (error) {
      throw error;
    }
  };

  var removeUserCollectionTitles = async function (tags) {
    try {
      let collectionTitles = await tagUtil.getCollectionTitlesFromTags(tags);

      if (collectionTitles.length > 0){
        return await Promise.all(
          collectionTitles.map(async collectionTitle => {
            const serviceSnapshot = await admin.firestore().collection(`users/${userId}/servicescollection/${collectionTitle}/services`).doc(serviceId).get();
            const serviceRef = serviceSnapshot.ref;

            if (serviceSnapshot.exists)
              await serviceRef.delete();

            return;
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var removeServiceImages = async function () {
    try {
      const serviceImageSnapshot = await admin.firestore().collection(`users/${userId}/services/${serviceId}/images`).get();

      if (serviceImageSnapshot.size > 0){
        return await Promise.all(
          serviceImageSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var removeServiceTags = async function () {
    try {
      const serviceTagSnapshot = await admin.firestore().collection(`users/${userId}/services/${serviceId}/tags`).get();

      if (serviceTagSnapshot.size > 0){
        return await Promise.all(
          serviceTagSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var removeWhereServings = async function () {
    try {
      const whereServingSnapshot = await admin.firestore().collection(`users/${userId}/services/${serviceId}/whereservings`).get();

      if (whereServingSnapshot.size > 0){
        return await Promise.all(
          whereServingSnapshot.docs.map(async whereServingDoc => {
            var whereServing = whereServingDoc.data();
            var removeRegistrant = async function () {
              try {
                var registrantSnapshot = await admin.firestore().collection(`users/${whereServing.uid}/forums/${whereServing.forumId}/registrants`).where("serviceId", "==", serviceId).get();
                var registrantRef = registrantSnapshot.docs[0].ref;
                var registrant = registrantSnapshot.docs[0].data();

                if (registrantSnapshot.size > 0)
                  await registrantRef.delete();

                // remove posts associated with this registrant
                const postSnapshot = await admin.firestore().collection(`users/${whereServing.uid}/forums/${whereServing.forumId}/posts`).where("registrantId", "==", registrant.registrantId).get();

                if (postSnapshot.size > 0){
                  return await Promise.all(
                    postSnapshot.docs.map(async postDoc => {
                      var userForumPostRef = admin.database().ref(`users/${whereServing.uid}/forums/${whereServing.forumId}/posts/${postDoc.data().postId}`);
                      return userForumPostRef.remove();
                    })
                  );
                }
                else return;
              } catch (error) {
                throw error;
              }
            };
            await removeRegistrant();
            return await whereServingDoc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var removePublicService = async function (tags) {
    try {
      var removePublicCollectionTitles = async function (tags) {
        try {
          let collectionTitles = await tagUtil.getCollectionTitlesFromTags(tags);

          if (collectionTitles.length > 0){
            return await Promise.all(
              collectionTitles.map(async collectionTitle => {
                const serviceSnapshot = await admin.firestore().collection(`servicescollection/${collectionTitle}/services`).doc(serviceId).get();
                const serviceRef = serviceSnapshot.ref;

                if (serviceSnapshot.exists)
                  await serviceRef.delete();

                return;
              })
            );
          }
          else return;
        } catch (error) {
          throw error;
        }
      };

      var removePublicServiceNoTags = async function () {
        const serviceSnapshot = await admin.firestore().collection('servicesnotags').doc(serviceId).get();
        const serviceRef = serviceSnapshot.ref;

        if (serviceSnapshot.exists)
          await serviceRef.delete();

        return;
      };

      const serviceSnapshot = await admin.firestore().collection('services').doc(serviceId).get();
      const serviceRef = serviceSnapshot.ref;

      if (serviceSnapshot.exists)
        await serviceRef.delete();

      if (tags.length > 0)
        return await removePublicCollectionTitles(tags);
      else
        return await removePublicServiceNoTags();
    } catch (error) {
      throw error;
    }
  };

  var removeAnonymousService = async function (tags) {
    try {
      var removeAnonymousCollectionTitles = async function (tags) {
        try {
          let collectionTitles = await tagUtil.getCollectionTitlesFromTags(tags);

          if (collectionTitles.length > 0){
            return await Promise.all(
              collectionTitles.map(async collectionTitle => {
                const serviceSnapshot = await admin.firestore().collection(`anonymousservicescollection/${collectionTitle}/services`).doc(serviceId).get();
                const serviceRef = serviceSnapshot.ref;

                if (serviceSnapshot.exists)
                  await serviceRef.delete();

                return;
              })
            );
          }
          else return;
        } catch (error) {
          throw error;
        }
      };

      var removeAnonymousServiceNoTags = async function () {
        const serviceSnapshot = await admin.firestore().collection('anonymousservicesnotags').doc(serviceId).get();
        const serviceRef = serviceSnapshot.ref;

        if (serviceSnapshot.exists)
          await serviceRef.delete();

        return;
      };

      const serviceSnapshot = await admin.firestore().collection('anonymousservices').doc(serviceId).get();
      const serviceRef = serviceSnapshot.ref;

      if (serviceSnapshot.exists)
        await serviceRef.delete();

      if (tags.length > 0)
        return await removeAnonymousCollectionTitles(tags);
      else
        return await removeAnonymousServiceNoTags();
    } catch (error) {
      throw error;
    }
  };

  var removeForumBlocks = async function () {
    try {
      const forumBlockSnapshot = await admin.firestore().collection(`users/${userId}/services/${serviceId}/forumblocks`).get();

      if (forumBlockSnapshot.size > 0){
        return await Promise.all(
          forumBlockSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var removeUserBlocks = async function () {
    try {
      const userBlockSnapshot = await admin.firestore().collection(`users/${userId}/services/${serviceId}/userblocks`).get();

      if (userBlockSnapshot.size > 0){
        return await Promise.all(
          userBlockSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var removeServiceRates = async function () {
    try {
      const serviceRateSnapshot = await admin.firestore().collection(`users/${userId}/services/${serviceId}/servicerates`).get();

      if (serviceRateSnapshot.size > 0){
        return await Promise.all(
          serviceRateSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var removeServiceReviews = async function () {
    try {
      const serviceReviewSnapshot = await admin.firestore().collection(`users/${userId}/services/${serviceId}/servicereviews`).get();

      if (serviceReviewSnapshot.size > 0){
        return await Promise.all(
          serviceReviewSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var getTags = async function (){
    try {
      const serviceTagSnapshot = await admin.firestore().collection(`users/${userId}/services/${serviceId}/tags`).get();
      var tags = [];

      if (serviceTagSnapshot.size > 0){
        serviceTagSnapshot.docs.forEach(doc => {
          tags.push(doc.data().tag);
        });
        tags.sort();
      }
      return tags;
    } catch (error) {
      throw error;
    }
  };

  try {
    const serviceSnapshot = await admin.firestore().collection(`users/${userId}/services`).select().get();
    const totalSnapshot = await admin.database().ref("totals").child(userId).once("value");

    if (totalSnapshot.exists())
      await admin.database().ref("totals").child(userId).update({ serviceCount: serviceSnapshot.size });

    let tags = await getTags();

    await removeServiceRates();
    await removeServiceReviews();
    await removeServiceImages();
    await removeWhereServings();
    await removeUserService(tags);
    await removeServiceTags();
    await removeForumBlocks();
    await removeUserBlocks();

    if (service.type == 'Public'){
      await removePublicService(tags);
      await removeAnonymousService(tags);
    }
    return await removeServiceTotals();
  }
  catch (error) {
    return Promise.reject(error);
  }
});

// ********************************************************************************
// createUserServiceTag
// ********************************************************************************
exports.createUserServiceTag = functions.firestore.document("users/{userId}/services/{serviceId}/tags/{tagId}").onCreate((snap, context) => {
  var tag = snap.data();
	var userId = context.params.userId;
	var serviceId = context.params.serviceId;
  var tagId = context.params.tagId;
  var service = null;

  var getService = function (){
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${userId}/services`).doc(serviceId).get().then(doc => {
        if (doc.exists)
          service = doc.data();

        resolve();
      }).catch(error => {
        reject(error);
      });
    });
  };

  var createTagService = function () {
    return new Promise((resolve, reject) => {
      if (service){
        var tagServiceRef = admin.firestore().collection(`users/${tag.uid}/tags`).doc(tagId).collection('services').doc(serviceId);
        tagServiceRef.set({
          serviceId: serviceId,
          uid: service.uid
        }).then(() => {
          resolve();
        })
        .catch(error => {
          reject(error);
        });
      }
      else resolve();
    });
  };

  var removeUserServiceNoTags = function () {
    return new Promise((resolve, reject) => {
      var serviceRef = admin.firestore().collection(`users/${userId}/servicesnotags`).doc(serviceId);
      serviceRef.get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      });
    });
  };

  var removePublicServiceNoTags = function () {
    return new Promise((resolve, reject) => {
      var serviceRef = admin.firestore().collection('servicesnotags').doc(serviceId);
      serviceRef.get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      });
    });
  };

  var removeAnonymousServiceNoTags = function () {
    return new Promise((resolve, reject) => {
      var serviceRef = admin.firestore().collection('anonymousservicesnotags').doc(serviceId);
      serviceRef.get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      });
    });
  };

  var createUserServiceCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var serviceRef = admin.firestore().collection(`users/${userId}/servicescollection/${collectionTitle}/services`).doc(serviceId);
              serviceRef.set(service).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var createPublicServiceCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var serviceRef = admin.firestore().collection(`servicescollection/${collectionTitle}/services`).doc(serviceId);
              serviceRef.set(service).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var createAnonymousServiceCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var serviceRef = admin.firestore().collection(`anonymousservicescollection/${collectionTitle}/services`).doc(serviceId);
              serviceRef.set(service).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var removeUserServiceCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var serviceRef = admin.firestore().collection(`users/${userId}/servicescollection/${collectionTitle}/services`).doc(serviceId);
              serviceRef.get().then(doc => {
                if (doc.exists){
                  doc.ref.delete().then(() => {
                    resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                }
                else resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var removePublicServiceCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var serviceRef = admin.firestore().collection(`servicescollection/${collectionTitle}/services`).doc(serviceId);
              serviceRef.get().then(doc => {
                if (doc.exists){
                  doc.ref.delete().then(() => {
                    resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                }
                else resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var removeAnonymousServiceCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var serviceRef = admin.firestore().collection(`anonymousservicescollection/${collectionTitle}/services`).doc(serviceId);
              serviceRef.get().then(doc => {
                if (doc.exists){
                  doc.ref.delete().then(() => {
                    resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                }
                else resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var getTags = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${userId}/services/${serviceId}/tags`).get().then(snapshot => {
        var tags = [];

        if (snapshot.size > 0){
          snapshot.docs.forEach(doc => {
            tags.push(doc.data().tag);
          });
          tags.sort();
        }
        resolve(tags);
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/services/${serviceId}/tags`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(serviceId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(serviceId).update({ tagCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  )
  .then(() => {
    return getService().then(() => {
      return createTagService().then(() => {
        return removeUserServiceNoTags().then(() => {
          return removePublicServiceNoTags().then(() => {
            return removeAnonymousServiceNoTags().then(() => {
              return getTags().then(tags => {
                if (tags.length == 1){
                  if (service){
                    return createUserServiceCollectionTitles([tag.tag]).then(() => {
                      if (service.indexed == true && service.type == 'Public'){
                        return createPublicServiceCollectionTitles([tag.tag]).then(() => {
                          return createAnonymousServiceCollectionTitles([tag.tag]).then(() => {
                            return Promise.resolve();
                          })
                          .catch(error => {
                            return Promise.reject(error);
                          });
                        })
                        .catch(error => {
                          return Promise.reject(error);
                        });
                      }
                      else return Promise.resolve();
                    })
                    .catch(error => {
                      return Promise.reject(error);
                    });
                  }
                  else return Promise.reject(`Service with serviceId ${serviceId} was not found`);
                }
                else {
                  let newTags = [];
                  let oldTags = [];

                  // get tags
                  for (let t in tags) {
                    newTags.push(tags[t]);

                    if (tags[t] != tag.tag)
                      oldTags.push(tags[t]);
                  }
                  newTags.sort();
                  oldTags.sort();

                  return removeUserServiceCollectionTitles(oldTags).then(() => {
                    return removePublicServiceCollectionTitles(oldTags).then(() => {
                      return removeAnonymousServiceCollectionTitles(oldTags).then(() => {
                        if (service){
                          return createUserServiceCollectionTitles(newTags).then(() => {
                            if (service.indexed == true && service.type == 'Public'){
                              return createPublicServiceCollectionTitles(newTags).then(() => {
                                return createAnonymousServiceCollectionTitles(newTags).then(() => {
                                  return Promise.resolve();
                                })
                                .catch(error => {
                                  return Promise.reject(error);
                                });
                              })
                              .catch(error => {
                                return Promise.reject(error);
                              });
                            }
                            else return Promise.resolve();
                          })
                          .catch(error => {
                            return Promise.reject(error);
                          });
                        }
                        else return Promise.reject(`Service with serviceId ${serviceId} was not found`);
                      })
                      .catch(error => {
                        return Promise.reject(error);
                      });
                    })
                    .catch(error => {
                      return Promise.reject(error);
                    });
                  })
                  .catch(error => {
                    return Promise.reject(error);
                  });
                }
              })
              .catch(error => {
                return Promise.reject(error);
              });
            })
            .catch(error => {
              return Promise.reject(error);
            });
          })
          .catch(error => {
            return Promise.reject(error);
          });
        })
        .catch(error => {
          return Promise.reject(error);
        });
      })
      .catch(error => {
        return Promise.reject(error);
      });
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteUserServiceTag
// ********************************************************************************
exports.deleteUserServiceTag = functions.firestore.document("users/{userId}/services/{serviceId}/tags/{tagId}").onDelete((snap, context) => {
  var tag = snap.data();
	var userId = context.params.userId;
	var serviceId = context.params.serviceId;
  var tagId = context.params.tagId;
  var service = null;

  var getService = function (){
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${userId}/services`).doc(serviceId).get().then(doc => {
        if (doc.exists)
          service = doc.data();

        resolve();
      }).catch(error => {
        reject(error);
      });
    });
  };

  var removeTagService = function () {
    return new Promise((resolve, reject) => {
      var tagServiceRef = admin.firestore().collection(`users/${tag.uid}/tags`).doc(tagId).collection('services').doc(serviceId);
      tagServiceRef.get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var addToUserServiceNoTags = function () {
    return new Promise((resolve, reject) => {
      var serviceRef = admin.firestore().collection(`users/${userId}/servicesnotags`).doc(serviceId);
      serviceRef.set(service).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var addToPublicServiceNoTags = function () {
    return new Promise((resolve, reject) => {
      var serviceRef = admin.firestore().collection('servicesnotags').doc(serviceId);
      serviceRef.set(service).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var addToAnonymousServiceNoTags = function () {
    return new Promise((resolve, reject) => {
      var serviceRef = admin.firestore().collection('anonymousservicesnotags').doc(serviceId);
      serviceRef.set(service).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var createUserServiceCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var serviceRef = admin.firestore().collection(`users/${userId}/servicescollection/${collectionTitle}/services`).doc(serviceId);
              serviceRef.set(service).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var createPublicServiceCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var serviceRef = admin.firestore().collection(`servicescollection/${collectionTitle}/services`).doc(serviceId);
              serviceRef.set(service).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var createAnonymousServiceCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var serviceRef = admin.firestore().collection(`anonymousservicescollection/${collectionTitle}/services`).doc(serviceId);
              serviceRef.set(service).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var removeUserServiceCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var serviceRef = admin.firestore().collection(`users/${userId}/servicescollection/${collectionTitle}/services`).doc(serviceId);
              serviceRef.get().then(doc => {
                if (doc.exists){
                  doc.ref.delete().then(() => {
                    resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                }
                else resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var removePublicServiceCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var serviceRef = admin.firestore().collection(`servicescollection/${collectionTitle}/services`).doc(serviceId);
              serviceRef.get().then(doc => {
                if (doc.exists){
                  doc.ref.delete().then(() => {
                    resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                }
                else resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var removeAnonymousServiceCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var serviceRef = admin.firestore().collection(`anonymousservicescollection/${collectionTitle}/services`).doc(serviceId);
              serviceRef.get().then(doc => {
                if (doc.exists){
                  doc.ref.delete().then(() => {
                    resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                }
                else resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var getTags = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${userId}/services/${serviceId}/tags`).get().then(snapshot => {
        var tags = [];

        if (snapshot.size > 0){
          snapshot.docs.forEach(doc => {
            tags.push(doc.data().tag);
          });
          tags.sort();
        }
        resolve(tags);
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/services/${serviceId}/tags`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(serviceId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(serviceId).update({ tagCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  )
  .then(() => {
    return getService().then(() => {
      return removeTagService().then(() => {
        return getTags().then(tags => {
          if (tags && tags.length > 0){
            // must be more tags than just the one being removed still remaining
            // so remove the old one's and create new ones with the ones remaining
            var tempTags = [];

            for (var t in tags) {
              if (tags[t] != tag.tag)
                tempTags.push(tags[t]);
            }

            return removeUserServiceCollectionTitles(tempTags.concat([tag.tag]).sort()).then(() => {
              return removePublicServiceCollectionTitles(tempTags.concat([tag.tag]).sort()).then(() => {
                return removeAnonymousServiceCollectionTitles(tempTags.concat([tag.tag]).sort()).then(() => {
                  if (service){
                    return createUserServiceCollectionTitles(tempTags.sort()).then(() => {
                      if (service.indexed == true && service.type == 'Public'){
                        return createPublicServiceCollectionTitles(tempTags.sort()).then(() => {
                          return createAnonymousServiceCollectionTitles(tempTags.sort()).then(() => {
                            return Promise.resolve();
                          })
                          .catch(error => {
                            return Promise.reject(error);
                          });
                        })
                        .catch(error => {
                          return Promise.reject(error);
                        });
                      }
                      else return Promise.resolve();
                    })
                    .catch(error => {
                      return Promise.reject(error);
                    });
                  }
                  else return Promise.reject(`Service with serviceId ${serviceId} was not found`);
                })
                .catch(error => {
                  return Promise.reject(error);
                });
              })
              .catch(error => {
                return Promise.reject(error);
              });
            })
            .catch(error => {
              return Promise.reject(error);
            });
          }
          else {
            // must be the current service tag that was just deleted, just remove collection and add to noTags collection
            return removeUserServiceCollectionTitles([tag.tag]).then(() => {
              return removePublicServiceCollectionTitles([tag.tag]).then(() => {
                return removeAnonymousServiceCollectionTitles([tag.tag]).then(() => {
                  if (service){
                    return addToUserServiceNoTags().then(() => {
                      if (service.indexed == true && service.type == 'Public'){
                        return addToPublicServiceNoTags().then(() => {
                          return addToAnonymousServiceNoTags().then(() => {
                            return Promise.resolve();
                          })
                          .catch(error => {
                            return Promise.reject(error);
                          });
                        })
                        .catch(error => {
                          return Promise.reject(error);
                        });
                      }
                      else return Promise.resolve();
                    })
                    .catch(error => {
                      return Promise.reject(error);
                    });
                  }
                  else return Promise.reject(`Service with serviceId ${serviceId} was not found`);
                })
                .catch(error => {
                  return Promise.reject(error);
                });
              })
              .catch(error => {
                return Promise.reject(error);
              });
            })
            .catch(error => {
              return Promise.reject(error);
            });
          }
        })
        .catch(error => {
          return Promise.reject(error);
        });
      })
      .catch(error => {
        return Promise.reject(error);
      });
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// createUserImageService
// ********************************************************************************
exports.createUserImageService = functions.firestore.document("users/{userId}/images/{imageId}/services/{serviceId}").onCreate((snap, context) => {
  var service = snap.data();
  var userId = context.params.userId;
  var imageId = context.params.imageId;
  var serviceId = context.params.serviceId;

  return admin.firestore().collection(`users/${userId}/images/${imageId}/services`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(imageId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(imageId).update({ serviceCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ********************************************************************************
// deleteUserImageService
// ********************************************************************************
exports.deleteUserImageService = functions.firestore.document("users/{userId}/images/{imageId}/services/{serviceId}").onDelete((snap, context) => {
  var service = snap.data();
  var userId = context.params.userId;
  var imageId = context.params.imageId;
  var serviceId = context.params.serviceId;

  return admin.firestore().collection(`users/${userId}/images/${imageId}/services`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(imageId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(imageId).update({ serviceCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ********************************************************************************
// createUserServiceImage
// ********************************************************************************
exports.createUserServiceImage = functions.firestore.document("users/{userId}/services/{serviceId}/images/{imageId}").onCreate(async (snap, context) => {
	var image = snap.data();
  var serviceImageRef = snap.ref;
	var userId = context.params.userId;
	var serviceId = context.params.serviceId;
	var imageId = context.params.imageId;
  var bucket = admin.storage().bucket();

	var tinyImageStorageFilePath = `users/${userId}/services/${serviceId}/images/tiny_${imageId}.jpg`;
	var smallImageStorageFilePath = `users/${userId}/services/${serviceId}/images/thumb_${imageId}.jpg`;
	var mediumImageStorageFilePath = `users/${userId}/services/${serviceId}/images/medium_${imageId}.jpg`;
	var largeImageStorageFilePath = `users/${userId}/services/${serviceId}/images/large_${imageId}.jpg`;
	var tinyLocation = `gs://${bucket.name}/${tinyImageStorageFilePath}`;
	var smallLocation = `gs://${bucket.name}/${smallImageStorageFilePath}`;
	var mediumLocation = `gs://${bucket.name}/${mediumImageStorageFilePath}`;
	var largeLocation = `gs://${bucket.name}/${largeImageStorageFilePath}`;

  var copyImage = async function (url, location){
    try {
      var file = bucket.file(url);
      return await file.copy(location);
    } catch (error) {
      throw error;
    }
  }

  var createUserImageService = async function () {
    try {
      var serviceSnapshot = await admin.firestore().collection(`users/${userId}/images/${imageId}/services`).doc(serviceId).get();
      var serviceRef = serviceSnapshot.ref;
      return await serviceRef.set({ serviceId: serviceId });
    } catch (error) {
      throw error;
    }
  };

  try {
    // repopulate image count
    const imageSnapshot = await admin.firestore().collection(`users/${userId}/services/${serviceId}/images`).select().get();
    const totalSnapshot = await admin.database().ref("totals").child(serviceId).once("value");

    if (totalSnapshot.exists())
      await admin.database().ref("totals").child(serviceId).update({ imageCount: imageSnapshot.size });

    let urlsToCreate = [
      { url: image.tinyUrl, location: tinyLocation },
      { url: image.smallUrl, location: smallLocation },
      { url: image.mediumUrl, location: mediumLocation },
      { url: image.largeUrl, location: largeLocation }
    ];

    await Promise.all(
      urlsToCreate.map(async obj => {
        return copyImage(obj.url, obj.location);
      })
    );

    // create image reference to this service
    return await createUserImageService();
  }
  catch (error) {
    return Promise.reject(error);
  }
});

// ********************************************************************************
// deleteUserServiceImage
// ********************************************************************************
exports.deleteUserServiceImage = functions.firestore.document("users/{userId}/services/{serviceId}/images/{imageId}").onDelete(async (snap, context) => {
	var image = snap.data();
	var userId = context.params.userId;
  var serviceId = context.params.serviceId;
  var imageId = context.params.imageId;
  var bucket = admin.storage().bucket();

  var removeImage = async function (path) {
    try {
      const bucketExists = await bucket.file(path).exists();

      if (bucketExists)
        await bucket.file(path).delete();

      return;
    } catch (error) {
      throw error;
    }
  };

  var deleteUserImageService = async function () {
    try {
      var serviceSnapshot = await admin.firestore().collection(`users/${userId}/images/${imageId}/services`).doc(serviceId).get();
      var serviceRef = serviceSnapshot.ref;

      if (serviceSnapshot.exists)
        await serviceRef.delete();

      return;
    } catch (error) {
      throw error;
    }
	};

  try {
    // repopulate image count
    const imageSnapshot = await admin.firestore().collection(`users/${userId}/services/${serviceId}/images`).select().get();
    const totalSnapshot = await admin.database().ref("totals").child(serviceId).once("value");

    if (totalSnapshot.exists())
      await admin.database().ref("totals").child(serviceId).update({ imageCount: imageSnapshot.size });

    let urlsToRemove = [image.tinyUrl, image.smallUrl, image.mediumUrl, image.largeUrl];

    await Promise.all(
      urlsToRemove.map(async url => {
        return removeImage(url);
      })
    );

    // remove images reference to this service
    return await deleteUserImageService();
  }
  catch (error) {
    return Promise.reject(error);
  }
});

// ********************************************************************************
// createUserServiceWhereServing
// ********************************************************************************
exports.createUserServiceWhereServing = functions.firestore.document("users/{userId}/services/{serviceId}/whereservings/{forumId}").onCreate((snap, context) => {
  var whereServing = snap.data();
  var userId = context.params.userId;
  var serviceId = context.params.serviceId;
  var forumId = context.params.forumId;

  return admin.firestore().collection(`users/${userId}/services/${serviceId}/whereservings`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(serviceId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(serviceId).update({ forumCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ********************************************************************************
// deleteUserServiceWhereServing
// ********************************************************************************
exports.deleteUserServiceWhereServing = functions.firestore.document("users/{userId}/services/{serviceId}/whereservings/{forumId}").onDelete((snap, context) => {
  var whereServing = snap.data();
  var userId = context.params.userId;
  var serviceId = context.params.serviceId;
  var forumId = context.params.forumId;

  return admin.firestore().collection(`users/${userId}/services/${serviceId}/whereservings`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(serviceId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(serviceId).update({ forumCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ********************************************************************************
// createUserServiceReview
// ********************************************************************************
exports.createUserServiceReview = functions.firestore.document("users/{userId}/services/{serviceId}/servicereviews/{serviceReviewId}").onCreate((snap, context) => {
  var serviceReview = snap.data();
  var userId = context.params.userId;
  var serviceId = context.params.serviceId;
  var serviceReviewId = context.params.serviceReviewId;

  var createReviewTotals = function () {
    return new Promise((resolve, reject) => {
      admin.database().ref('totals').child(serviceReviewId).set({
        commentCount: 0
      })
      .then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var createUserServiceCreatedReview = function () {
    return new Promise((resolve, reject) => {
      var newServiceCreatedReview = {
        serviceCreatedReviewId: uuid.v4().replace(/-/g, ''),
        serviceReviewId: serviceReviewId,
        serviceReviewServiceId: serviceId,
        serviceReviewServiceUid: userId,
        review: serviceReview.review,
        lastUpdateDate: FieldValue.serverTimestamp(),
        creationDate: FieldValue.serverTimestamp()
      };

      var serviceCreatedReviewRef = admin.firestore().collection(`users/${serviceReview.serviceUid}/services/${serviceReview.serviceId}/servicecreatedreviews`).doc(newServiceCreatedReview.serviceCreatedReviewId);
      serviceCreatedReviewRef.set(newServiceCreatedReview).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/services/${serviceId}/servicereviews`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(serviceId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(serviceId).update({ reviewCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return createReviewTotals().then(() => {
      return createUserServiceCreatedReview().then(() => {
        return Promise.resolve();
      })
      .catch(error => {
        return Promise.reject(error);
      });
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// updateUserServiceReview
// ********************************************************************************
exports.updateUserServiceReview = functions.firestore.document('users/{userId}/services/{serviceId}/servicereviews/{serviceReviewId}').onUpdate((change, context) => {
  var newValue = change.after.data();
  var previousValue = change.before.data();
  var userId = context.params.userId;
  var serviceId = context.params.serviceId;
  var serviceReviewId = context.params.serviceReviewId;

  var updateUserServiceCreatedReview = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${newValue.serviceUid}/services/${newValue.serviceId}/servicecreatedreviews`)
        .where('serviceReviewServiceId', '==', serviceId)
        .where('serviceReviewServiceUid', '==', userId)
        .get().then(snapshot => {
          if (snapshot.size > 0){
            var promises = snapshot.docs.map(doc => {
              return new Promise((resolve, reject) => {
                doc.ref.update({ review: newValue.review }).then(() => {
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          }
          else resolve();
        }
      )
      .catch(error => {
        reject(error);
      });
    });
  };

  return updateUserServiceCreatedReview().then(() => {
    return Promise.resolve();
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteUserServiceReview
// ********************************************************************************
exports.deleteUserServiceReview = functions.firestore.document("users/{userId}/services/{serviceId}/servicereviews/{serviceReviewId}").onDelete((snap, context) => {
  var serviceReview = snap.data();
  var userId = context.params.userId;
  var serviceId = context.params.serviceId;
  var serviceReviewId = context.params.serviceReviewId;

  var removeReviewTotals = function () {
    return new Promise((resolve, reject) => {
      admin.database().ref('totals').child(serviceReviewId).remove(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var removeUserServiceCreatedReview = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${serviceReview.serviceUid}/services/${serviceReview.serviceId}/servicecreatedreviews`)
        .where('serviceReviewServiceId', '==', serviceId)
        .where('serviceReviewServiceUid', '==', userId)
        .get().then(snapshot => {
          if (snapshot.size > 0){
            var promises = snapshot.docs.map(doc => {
              return new Promise((resolve, reject) => {
                doc.ref.delete().then(() => {
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          }
          else resolve();
        }
      )
      .catch(error => {
        reject(error);
      });
    });
  };

  var removeServiceReviewComments = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${userId}/services/${serviceId}/servicereviews/${serviceReviewId}/servicereviewcomments`).get().then(snapshot => {
        if (snapshot.size > 0){
          var promises = snapshot.docs.map(doc => {
            return new Promise((resolve, reject) => {
              doc.ref.delete().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/services/${serviceId}/servicereviews`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(serviceId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(serviceId).update({ reviewCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return removeReviewTotals().then(() => {
      return removeUserServiceCreatedReview().then(() => {
        return removeServiceReviewComments().then(() => {
          return Promise.resolve();
        })
        .catch(error => {
          return Promise.reject(error);
        });
      })
      .catch(error => {
        return Promise.reject(error);
      });
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// createUserServiceReviewComment
// ********************************************************************************
exports.createUserServiceReviewComment = functions.firestore.document("users/{userId}/services/{serviceId}/servicereviews/{serviceReviewId}/servicereviewcomments/{serviceReviewCommentId}").onCreate((snap, context) => {
  var serviceReviewComment = snap.data();
  var userId = context.params.userId;
  var serviceId = context.params.serviceId;
  var serviceReviewId = context.params.serviceReviewId;
  var serviceReviewCommentId = context.params.serviceReviewCommentId;

  var createUserServiceCreatedComment = function () {
    return new Promise((resolve, reject) => {
      var newServiceCreatedComment = {
        serviceCreatedCommentId: uuid.v4().replace(/-/g, ''),
        serviceReviewCommentId: serviceReviewCommentId,
        serviceReviewId: serviceReviewId,
        serviceReviewServiceId: serviceId,
        serviceReviewServiceUid: userId,
        comment: serviceReviewComment.comment,
        lastUpdateDate: FieldValue.serverTimestamp(),
        creationDate: FieldValue.serverTimestamp()
      };

      var serviceCreatedCommentRef = admin.firestore().collection(`users/${serviceReviewComment.serviceUid}/services/${serviceReviewComment.serviceId}/servicecreatedcomments`).doc(newServiceCreatedComment.serviceCreatedCommentId);
      serviceCreatedCommentRef.set(newServiceCreatedComment).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/services/${serviceId}/servicereviews/${serviceReviewId}/servicereviewcomments`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(serviceReviewId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(serviceReviewId).update({ commentCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return createUserServiceCreatedComment().then(() => {
      return Promise.resolve();
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// updateUserServiceReviewComment
// ********************************************************************************
exports.updateUserServiceReviewComment = functions.firestore.document('users/{userId}/services/{serviceId}/servicereviews/{serviceReviewId}/servicereviewcomments/{serviceReviewCommentId}').onUpdate((change, context) => {
  var newValue = change.after.data();
  var previousValue = change.before.data();
  var userId = context.params.userId;
  var serviceId = context.params.serviceId;
  var serviceReviewId = context.params.serviceReviewId;
  var serviceReviewCommentId = context.params.serviceReviewCommentId;

  var updateUserServiceCreatedComment = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${newValue.serviceUid}/services/${newValue.serviceId}/servicecreatedcomments`)
        .where('serviceReviewCommentId', '==', serviceReviewCommentId)
        .get().then(snapshot => {
          if (snapshot.size > 0){
            var promises = snapshot.docs.map(doc => {
              return new Promise((resolve, reject) => {
                doc.ref.update({ comment: newValue.comment }).then(() => {
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          }
          else resolve();
        }
      )
      .catch(error => {
        reject(error);
      });
    });
  };

  return updateUserServiceCreatedComment().then(() => {
    return Promise.resolve();
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteUserServiceReviewComment
// ********************************************************************************
exports.deleteUserServiceReviewComment = functions.firestore.document("users/{userId}/services/{serviceId}/servicereviews/{serviceReviewId}/servicereviewcomments/{serviceReviewCommentId}").onDelete((snap, context) => {
  var serviceReviewComment = snap.data();
  var userId = context.params.userId;
  var serviceId = context.params.serviceId;
  var serviceReviewId = context.params.serviceReviewId;
  var serviceReviewCommentId = context.params.serviceReviewCommentId;

  var removeUserServiceCreatedComment = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${serviceReviewComment.serviceUid}/services/${serviceReviewComment.serviceId}/servicecreatedcomments`)
        .where('serviceReviewCommentId', '==', serviceReviewCommentId)
        .get().then(snapshot => {
          if (snapshot.size > 0){
            var promises = snapshot.docs.map(doc => {
              return new Promise((resolve, reject) => {
                doc.ref.delete().then(() => {
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          }
          else resolve();
        }
      )
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/services/${serviceId}/servicereviews/${serviceReviewId}/servicereviewcomments`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(serviceReviewId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(serviceReviewId).update({ commentCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return removeUserServiceCreatedComment().then(() => {
      return Promise.resolve();
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// createUserServiceRate
// ********************************************************************************
exports.createUserServiceRate = functions.firestore.document("users/{userId}/services/{serviceId}/servicerates/{serviceRateId}").onCreate((snap, context) => {
  var serviceRate = snap.data();
  var userId = context.params.userId;
  var serviceId = context.params.serviceId;
  var serviceRateId = context.params.serviceRateId;
  var averageTotal = 0;

  var updateServiceRateTotal = function (rate) {
    return new Promise((resolve, reject) => {
      var serviceRef = admin.firestore().collection(`users/${userId}/services`).doc(serviceId);
      serviceRef.update({ rate: rate }).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var createUserServiceCreatedRate = function () {
    return new Promise((resolve, reject) => {
      var newServiceCreatedRate = {
        serviceCreatedRateId: uuid.v4().replace(/-/g, ''),
        serviceRateId: serviceRateId,
        serviceRateServiceId: serviceId,
        serviceRateServiceUid: userId,
        rate: serviceRate.rate,
        lastUpdateDate: FieldValue.serverTimestamp(),
        creationDate: FieldValue.serverTimestamp()
      };

      var serviceCreatedRateRef = admin.firestore().collection(`users/${serviceRate.serviceUid}/services/${serviceRate.serviceId}/servicecreatedrates`).doc(newServiceCreatedRate.serviceCreatedRateId);
      serviceCreatedRateRef.set(newServiceCreatedRate).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/services/${serviceId}/servicerates`)
    .get().then(snapshot => {
      // iterate each snapshot value and determine average
      var promises = snapshot.docs.map(doc => {
        return new Promise((resolve, reject) => {
          averageTotal += parseInt(doc.data().rate);
          resolve();
        });
      });

      return Promise.all(promises).then(() => {
        return admin.database().ref("totals").child(serviceId).once("value", totalSnapshot => {
          if (totalSnapshot.exists()){
            var rateAverage = 0;

            if (averageTotal > 0)
              rateAverage = averageTotal/snapshot.size;

            return admin.database().ref("totals").child(serviceId).update({ rateAverage: rateAverage, rateCount: snapshot.size }).then(() => {
              return updateServiceRateTotal(averageTotal/snapshot.size).then(() => {
                return Promise.resolve();
              })
              .catch(error => {
                return Promise.reject(error);
              });
            }).catch(error => {
              return Promise.reject(error);
            });
          }
          else return Promise.resolve();
        });
      })
      .catch(error => {
        return Promise.reject(error);
      });
    }
  ).then(() => {
    return createUserServiceCreatedRate().then(() => {
      return Promise.resolve();
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// updateUserServiceRate
// ********************************************************************************
exports.updateUserServiceRate = functions.firestore.document('users/{userId}/services/{serviceId}/servicerates/{serviceRateId}').onUpdate((change, context) => {
  var newValue = change.after.data();
  var previousValue = change.before.data();
  var userId = context.params.userId;
  var serviceId = context.params.serviceId;
  var serviceRateId = context.params.serviceRateId;
  var averageTotal = 0;

  var updateServiceRateTotal = function (rate) {
    return new Promise((resolve, reject) => {
      var serviceRef = admin.firestore().collection(`users/${userId}/services`).doc(serviceId);
      serviceRef.update({ rate: rate }).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var updateUserServiceCreatedRate = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${newValue.serviceUid}/services/${newValue.serviceId}/servicecreatedrates`)
        .where('serviceRateServiceId', '==', serviceId)
        .where('serviceRateServiceUid', '==', userId)
        .get().then(snapshot => {
          if (snapshot.size > 0){
            var promises = snapshot.docs.map(doc => {
              return new Promise((resolve, reject) => {
                doc.ref.update({ rate: newValue.rate }).then(() => {
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          }
          else resolve();
        }
      )
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/services/${serviceId}/servicerates`)
    .get().then(snapshot => {
      // iterate each snapshot value and determine average
      var promises = snapshot.docs.map(doc => {
        return new Promise((resolve, reject) => {
          averageTotal += parseInt(doc.data().rate);
          resolve();
        });
      });

      return Promise.all(promises).then(() => {
        return admin.database().ref("totals").child(serviceId).once("value", totalSnapshot => {
          if (totalSnapshot.exists()){
            var rateAverage = 0;

            if (averageTotal > 0)
              rateAverage = averageTotal/snapshot.size;

            return admin.database().ref("totals").child(serviceId).update({ rateAverage: rateAverage, rateCount: snapshot.size }).then(() => {
              return updateServiceRateTotal(averageTotal/snapshot.size).then(() => {
                return Promise.resolve();
              })
              .catch(error => {
                return Promise.reject(error);
              });
            }).catch(error => {
              return Promise.reject(error);
            });
          }
          else return Promise.resolve();
        });
      })
      .catch(error => {
        return Promise.reject(error);
      });
    }
  ).then(() => {
    return updateUserServiceCreatedRate().then(() => {
      return Promise.resolve();
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteUserServiceRate
// ********************************************************************************
exports.deleteUserServiceRate = functions.firestore.document("users/{userId}/services/{serviceId}/servicerates/{serviceRateId}").onDelete((snap, context) => {
  var serviceRate = snap.data();
  var userId = context.params.userId;
  var serviceId = context.params.serviceId;
  var serviceRateId = context.params.serviceRateId;
  var averageTotal = 0;

  var updateServiceRateTotal = function (rate) {
    return new Promise((resolve, reject) => {
      var serviceRef = admin.firestore().collection(`users/${userId}/services`).doc(serviceId);
      serviceRef.update({ rate: rate }).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var removeUserServiceCreatedRate = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${serviceRate.serviceUid}/services/${serviceRate.serviceId}/servicecreatedrates`)
        .where('serviceRateServiceId', '==', serviceId)
        .where('serviceRateServiceUid', '==', userId)
        .get().then(snapshot => {
          if (snapshot.size > 0){
            var promises = snapshot.docs.map(doc => {
              return new Promise((resolve, reject) => {
                doc.ref.delete().then(() => {
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          }
          else resolve();
        }
      )
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/services/${serviceId}/servicerates`)
    .get().then(snapshot => {
      // iterate each snapshot value and determine average
      var promises = snapshot.docs.map(doc => {
        return new Promise((resolve, reject) => {
          averageTotal += parseInt(doc.data().rate);
          resolve();
        });
      });

      return Promise.all(promises).then(() => {
        return admin.database().ref("totals").child(serviceId).once("value", totalSnapshot => {
          if (totalSnapshot.exists()){
            var rateAverage = 0;

            if (averageTotal > 0)
              rateAverage = averageTotal/snapshot.size;

            return admin.database().ref("totals").child(serviceId).update({ rateAverage: rateAverage, rateCount: snapshot.size }).then(() => {
              return updateServiceRateTotal(averageTotal/snapshot.size).then(() => {
                return Promise.resolve();
              })
              .catch(error => {
                return Promise.reject(error);
              });
            }).catch(error => {
              return Promise.reject(error);
            });
          }
          else return Promise.resolve();
        });
      })
      .catch(error => {
        return Promise.reject(error);
      });
    }
  ).then(() => {
    return removeUserServiceCreatedRate().then(() => {
      return Promise.resolve();
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// createUserServiceCreatedReview
// ********************************************************************************
exports.createUserServiceCreatedReview = functions.firestore.document("users/{userId}/services/{serviceId}/servicecreatedreviews/{serviceCreatedReviewId}").onCreate((snap, context) => {
  var serviceCreatedReview = snap.data();
  var userId = context.params.userId;
  var serviceId = context.params.serviceId;
  var serviceCreatedReviewId = context.params.serviceCreatedReviewId;

  return admin.firestore().collection(`users/${userId}/services/${serviceId}/servicecreatedreviews`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(serviceId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(serviceId).update({ createdReviewCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ********************************************************************************
// deleteUserServiceCreatedReview
// ********************************************************************************
exports.deleteUserServiceCreatedReview = functions.firestore.document("users/{userId}/services/{serviceId}/servicecreatedreviews/{serviceCreatedReviewId}").onDelete((snap, context) => {
  var serviceCreatedReview = snap.data();
  var userId = context.params.userId;
  var serviceId = context.params.serviceId;
  var serviceCreatedReviewId = context.params.serviceCreatedReviewId;

  return admin.firestore().collection(`users/${userId}/services/${serviceId}/servicecreatedreviews`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(serviceId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(serviceId).update({ createdReviewCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ********************************************************************************
// createUserServiceCreatedRate
// ********************************************************************************
exports.createUserServiceCreatedRate = functions.firestore.document("users/{userId}/services/{serviceId}/servicecreatedrates/{serviceCreatedRateId}").onCreate((snap, context) => {
  var serviceCreatedRate = snap.data();
  var userId = context.params.userId;
  var serviceId = context.params.serviceId;
  var serviceCreatedRateId = context.params.serviceCreatedRateId;

  return admin.firestore().collection(`users/${userId}/services/${serviceId}/servicecreatedrates`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(serviceId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(serviceId).update({ createdRateCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ********************************************************************************
// deleteUserServiceCreatedRate
// ********************************************************************************
exports.deleteUserServiceCreatedRate = functions.firestore.document("users/{userId}/services/{serviceId}/servicecreatedrates/{serviceCreatedRateId}").onDelete((snap, context) => {
  var serviceCreatedRate = snap.data();
  var userId = context.params.userId;
  var serviceId = context.params.serviceId;
  var serviceCreatedRateId = context.params.serviceCreatedRateId;

  return admin.firestore().collection(`users/${userId}/services/${serviceId}/servicecreatedrates`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(serviceId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(serviceId).update({ createdRateCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ********************************************************************************
// createUserServiceCreatedComment
// ********************************************************************************
exports.createUserServiceCreatedComment = functions.firestore.document("users/{userId}/services/{serviceId}/servicecreatedcomments/{serviceCreatedCommentId}").onCreate((snap, context) => {
  var serviceCreatedComment = snap.data();
  var userId = context.params.userId;
  var serviceId = context.params.serviceId;
  var serviceCreatedCommentId = context.params.serviceCreatedCommentId;

  return admin.firestore().collection(`users/${userId}/services/${serviceId}/servicecreatedcomments`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(serviceId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(serviceId).update({ createdCommentCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ********************************************************************************
// deleteUserServiceCreatedComment
// ********************************************************************************
exports.deleteUserServiceCreatedComment = functions.firestore.document("users/{userId}/services/{serviceId}/servicecreatedcomments/{serviceCreatedCommentId}").onDelete((snap, context) => {
  var serviceCreatedComment = snap.data();
  var userId = context.params.userId;
  var serviceId = context.params.serviceId;
  var serviceCreatedCommentId = context.params.serviceCreatedCommentId;

  return admin.firestore().collection(`users/${userId}/services/${serviceId}/servicecreatedcomments`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(serviceId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(serviceId).update({ createdCommentCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ********************************************************************************
// createUserForumBlock
// ********************************************************************************
exports.createUserForumBlock = functions.firestore.document("users/{userId}/forumblocks/{forumBlockId}").onCreate((snap, context) => {
  // forumBlockId: 9999
  // forumId: 99999 - forum being blocked
  // forumUid: 9999 - owner of forum
  // serviceId: 99999 - service doing the blocking
  // serviceUid: 9999 - owner of the service
  var forumBlock = snap.data();
  var userId = context.params.userId;
  var forumBlockId = context.params.forumBlockId;

  var removeRegistrant = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${forumBlock.forumUid}/forums/${forumBlock.forumId}/registrants`)
        .where('serviceId', '==', forumBlock.serviceId)
        .get().then(snapshot => {
          if (snapshot.size > 0) {
            var promises = snapshot.docs.map(doc => {
              return new Promise((resolve, reject) => {
                doc.ref.delete().then(() => {
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          }
          else resolve();
        })
        .catch(error => {
          reject(error);
        }
      );
    });
  };

  // users/${userId}/services/${serviceId}/forumblocks
  var createUserServiceForumBlock = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${forumBlock.serviceUid}/services/${forumBlock.serviceId}/forumblocks`).doc(forumBlockId).set(forumBlock).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/forumblocks`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(userId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(userId).update({ forumBlockCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return removeRegistrant().then(() => {
      return createUserServiceForumBlock().then(() => {
        return Promise.resolve();
      })
      .catch(error => {
        return Promise.reject(error);
      });
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteUserForumBlock
// ********************************************************************************
exports.deleteUserForumBlock = functions.firestore.document("users/{userId}/forumblocks/{forumBlockId}").onDelete((snap, context) => {
  var forumBlock = snap.data();
  var userId = context.params.userId;
  var forumBlockId = context.params.forumBlockId;

  // users/${userId}/services/${serviceId}/forumblocks
  var removeUserServiceForumBlock = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${forumBlock.serviceUid}/services/${forumBlock.serviceId}/forumblocks`).doc(forumBlockId).get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/forumblocks`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(userId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(userId).update({ forumBlockCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return removeUserServiceForumBlock().then(() => {
      return Promise.resolve();
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// createUserForumUserBlock
// ********************************************************************************
exports.createUserForumUserBlock = functions.firestore.document("users/{parentUserId}/forumuserblocks/{forumUserBlockId}").onCreate((snap, context) => {
  // userId: 99999 - user being blocked
  var forumUserBlock = snap.data();
  var parentUserId = context.params.parentUserId;
  var forumUserBlockId = context.params.forumUserBlockId;

  var removeRegistrants = function () {
    return new Promise((resolve, reject) => {
      // go through each of the user being blocked forums and
      // remove the user from them
      admin.firestore().collection(`users/${forumUserBlock.userId}/forums`)
        .get().then(forumSnapshot => {
          if (forumSnapshot.size > 0) {
            var promises = forumSnapshot.docs.map(forumDoc => {
              return new Promise((resolve, reject) => {
                admin.firestore().collection(`users/${forumDoc.data().uid}/forums/${forumDoc.data().forumId}/registrants`)
                  .where('uid', '==', parentUserId)
                  .get().then(registrantSnapshot => {
                    if (registrantSnapshot.size > 0) {
                      var promises = registrantSnapshot.docs.map(registrantDoc => {
                        return new Promise((resolve, reject) => {
                          registrantDoc.ref.delete().then(() => {
                            resolve();
                          })
                          .catch(error => {
                            reject(error);
                          });
                        });
                      });

                      Promise.all(promises).then(() => {
                        resolve();
                      })
                      .catch(error => {
                        reject(error);
                      });
                    }
                    else resolve();
                  })
                  .catch(error => {
                    reject(error);
                  }
                );
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          }
          else resolve();
        })
        .catch(error => {
          reject(error);
        }
      );
    });
  };

  // users/${userId}/services/${serviceId}/userblocks
  var createUserServiceForumUserBlock = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${forumUserBlock.serviceUid}/services/${forumUserBlock.serviceId}/userblocks`).doc(forumUserBlockId).set(forumUserBlock).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${parentUserId}/forumuserblocks`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(parentUserId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(parentUserId).update({ forumUserBlockCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return createUserServiceForumUserBlock().then(() => {
      return removeRegistrants().then(() => {
        return Promise.resolve();
      })
      .catch(error => {
        return Promise.reject(error);
      });
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteUserForumUserBlock
// ********************************************************************************
exports.deleteUserForumUserBlock = functions.firestore.document("users/{parentUserId}/forumuserblocks/{forumUserBlockId}").onDelete((snap, context) => {
  var forumUserBlock = snap.data();
  var parentUserId = context.params.parentUserId;
  var forumUserBlockId = context.params.forumUserBlockId;

  // users/${userId}/services/${serviceId}/userblocks
  var removeUserServiceForumUserBlock = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${forumUserBlock.serviceUid}/services/${forumUserBlock.serviceId}/userblocks`).doc(forumUserBlockId).get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      });
    });
  };

  return admin.firestore().collection(`users/${parentUserId}/forumuserblocks`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(parentUserId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(parentUserId).update({ forumUserBlockCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return removeUserServiceForumUserBlock().then(() => {
      return Promise.resolve();
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// FORUM

// ********************************************************************************
// createUserForum
// ********************************************************************************
exports.createUserForum = functions.firestore.document("users/{userId}/forums/{forumId}").onCreate((snap, context) => {
  var forum = snap.data();
  var forumId = context.params.forumId;
  var userId = context.params.userId;

  var createForumTotals = function () {
    return new Promise((resolve, reject) => {
      admin.database().ref('totals').child(forumId).set({
        registrantCount: 0,
        forumCount: 0,
        postCount: 0,
        tagCount: 0,
        imageCount: 0
      })
      .then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var addToUserForumNoTags = function () {
    return new Promise((resolve, reject) => {
      var forumRef = admin.firestore().collection(`users/${userId}/forumsnotags`).doc(forumId);
      forumRef.set(forum).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var addToPublicForumNoTags = function () {
    return new Promise((resolve, reject) => {
      var forumRef = admin.firestore().collection('forumsnotags').doc(forumId);
      forumRef.set(forum).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var addToAnonymousForumNoTags = function () {
    return new Promise((resolve, reject) => {
      var forumRef = admin.firestore().collection('anonymousforumsnotags').doc(forumId);
      forumRef.set(forum).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var createPublicForum = function () {
    return new Promise((resolve, reject) => {
      var forumRef = admin.firestore().collection('forums').doc(forumId);
      forumRef.set(forum).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var createAnonymousForum = function () {
    return new Promise((resolve, reject) => {
      var anonymousForumRef = admin.firestore().collection('anonymousforums').doc(forumId);
      anonymousForumRef.set(forum).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/forums`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(userId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(userId).update({ forumCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return createForumTotals().then(() => {
      return addToUserForumNoTags().then(() => {
        if (forum.indexed == true && forum.type == 'Public'){
          return createPublicForum().then(() => {
            return createAnonymousForum().then(() => {
              return addToPublicForumNoTags().then(() => {
                return addToAnonymousForumNoTags().then(() => {
                  return Promise.resolve();
                })
                .catch(error => {
                  return Promise.reject(error);
                });
              })
              .catch(error => {
                return Promise.reject(error);
              });
            })
            .catch(error => {
              return Promise.reject(error);
            });
          })
          .catch(error => {
            return Promise.reject(error);
          });
        }
        else return Promise.resolve();
      })
      .catch(error => {
        return Promise.reject(error);
      });
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// updateUserForum
// ********************************************************************************
exports.updateUserForum = functions.firestore.document("users/{userId}/forums/{forumId}").onUpdate((change, context) => {
  var newValue = change.after.data();
  var previousValue = change.before.data();
  var userId = context.params.userId;
  var forumId = context.params.forumId;

  var updateParentForum = function () {
    return new Promise((resolve, reject) => {
      if ((newValue.parentId && newValue.parentId.length > 0) && (newValue.parentUid && newValue.parentUid.length > 0)){
        admin.firestore().collection(`users/${newValue.parentUid}/forums/${newValue.parentId}/forums`).doc(forumId).get().then(doc => {
          if (doc.exists){
            doc.ref.update({
              forumId: newValue.forumId,
              parentId: newValue.parentId,
              parentUid: newValue.parentUid,
              uid: newValue.uid,
              type: newValue.type,
              title: newValue.title,
              title_lowercase: newValue.title_lowercase,
              description: newValue.description,
              website: newValue.website,
              indexed: newValue.indexed,
              includeDescriptionInDetailPage: newValue.includeDescriptionInDetailPage,
              includeImagesInDetailPage: newValue.includeImagesInDetailPage,
              includeTagsInDetailPage: newValue.includeTagsInDetailPage,
              lastUpdateDate: newValue.lastUpdateDate,
              creationDate: newValue.creationDate
            }).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          }
          else resolve();
        })
        .catch(error => {
          reject(error);
        });
      }
      else resolve();
    });
  };

  var updateUsersActivityForums = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${userId}/forums/${forumId}/registrants`)
        .get().then(snapshot => {
          if (snapshot.size > 0){
            var promises = snapshot.docs.map(registrantDoc => {
              return new Promise((resolve, reject) => {
                admin.firestore().collection(`users/${registrantDoc.data().uid}/activities`).doc(forumId).get().then(doc => {
                  if (doc.exists){
                    doc.ref.update({
                      forumId: newValue.forumId,
                      parentId: newValue.parentId,
                      parentUid: newValue.parentUid,
                      uid: newValue.uid,
                      type: newValue.type,
                      title: newValue.title,
                      title_lowercase: newValue.title_lowercase,
                      description: newValue.description,
                      website: newValue.website,
                      indexed: newValue.indexed,
                      includeDescriptionInDetailPage: newValue.includeDescriptionInDetailPage,
                      includeImagesInDetailPage: newValue.includeImagesInDetailPage,
                      includeTagsInDetailPage: newValue.includeTagsInDetailPage,
                      forumLastUpdateDate: newValue.lastUpdateDate,
                      forumCreationDate: newValue.creationDate
                    }).then(() => {
                      resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  }
                  else resolve();
                })
                .catch(error => {
                  reject(error);
                });
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          }
          else resolve();
        }
      );
    });
  };

  var updateUserCollectionTitles = function (tags) {
    return new Promise((resolve, reject) => {
      tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
        var promises = collectionTitles.map(collectionTitle => {
          return new Promise((resolve, reject) => {
            admin.firestore().collection(`users/${userId}/forumscollection/${collectionTitle}/forums`).doc(forumId).get().then(doc => {
              if (doc.exists){
                doc.ref.update(newValue).then(() => {
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              }
              else resolve();
            })
            .catch(error => {
              reject(error);
            });
          });
        });

        Promise.all(promises).then(() => {
          resolve();
        })
        .catch(error => {
          reject(error);
        });
      });
    });
  };

  var addToUserNoTags = function () {
    return new Promise((resolve, reject) => {
      var forumRef = admin.firestore().collection(`users/${userId}/forumsnotags`).doc(forumId);
      forumRef.set(newValue).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var removeUserNoTags = function () {
    return new Promise((resolve, reject) => {
      var forumRef = admin.firestore().collection(`users/${userId}/forumsnotags`).doc(forumId);
      forumRef.get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      });
    });
  };

  var updateUserForum = function (tags) {
    return new Promise((resolve, reject) => {
      if (tags && tags.length > 0){
        removeUserNoTags().then(() => {
          updateUserCollectionTitles(tags).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        })
        .catch(error => {
          reject(error);
        });
      }
      else {
        addToUserNoTags().then(() => {
          resolve();
        })
        .catch(error => {
          reject(error);
        });
      }
    });
  };

  var createOrUpdatePublicForum = function (tags) {
    return new Promise((resolve, reject) => {
      var createPublicForumCollectionTitles = function (tags) {
        return new Promise((resolve, reject) => {
          tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
            var promises = collectionTitles.map(collectionTitle => {
              return new Promise((resolve, reject) => {
                admin.firestore().collection(`forumscollection/${collectionTitle}/forums`).doc(forumId).get().then(doc => {
                  if (doc.exists){
                    doc.ref.update(newValue).then(() => {
                      resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  }
                  else {
                    doc.ref.create(newValue).then(() => {
                      resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  }
                })
                .catch(error => {
                  reject(error);
                });
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          });
        });
      };

      var updatePublicForumCollectionTitles = function (tags) {
        return new Promise((resolve, reject) => {
          tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
            var promises = collectionTitles.map(collectionTitle => {
              return new Promise((resolve, reject) => {
                admin.firestore().collection(`forumscollection/${collectionTitle}/forums`).doc(forumId).get().then(doc => {
                  if (doc.exists){
                    doc.ref.update(newValue).then(() => {
                      resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  }
                  else {
                    doc.ref.create(newValue).then(() => {
                      resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  }
                })
                .catch(error => {
                  reject(error);
                });
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          });
        });
      };

      var addToPublicForumNoTags = function () {
        return new Promise((resolve, reject) => {
          var forumRef = admin.firestore().collection('forumsnotags').doc(forumId);
          forumRef.set(newValue).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      };

      var removePublicForumNoTags = function () {
        return new Promise((resolve, reject) => {
          var forumRef = admin.firestore().collection('forumsnotags').doc(forumId);
          forumRef.get().then(doc => {
            if (doc.exists){
              doc.ref.delete().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else resolve();
          });
        });
      };

      admin.firestore().collection('forums').doc(forumId).get().then(doc => {
        if (doc.exists){
          doc.ref.update(newValue).then(() => {
            if (tags && tags.length > 0) {
              removePublicForumNoTags().then(() => {
                updatePublicForumCollectionTitles(tags).then(() => {
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              })
              .catch(error => {
                reject(error);
              });
            }
            else {
              addToPublicForumNoTags().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
          })
          .catch(error => {
            reject(error);
          });
        }
        else {
          var forumRef = admin.firestore().collection('forums').doc(forumId);
          forumRef.set(newValue).then(() => {
            if (tags && tags.length > 0){
              createPublicForumCollectionTitles(tags).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else {
              addToPublicForumNoTags().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
          })
          .catch(error => {
            reject(error);
          });
        }
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var createOrUpdateAnonymousForum = function (tags) {
    return new Promise((resolve, reject) => {
      var createAnonymousForumCollectionTitles = function (tags) {
        return new Promise((resolve, reject) => {
          tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
            var promises = collectionTitles.map(collectionTitle => {
              return new Promise((resolve, reject) => {
                admin.firestore().collection(`anonymousforumscollection/${collectionTitle}/forums`).doc(forumId).get().then(doc => {
                  if (doc.exists){
                    doc.ref.update(newValue).then(() => {
                      resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  }
                  else {
                    doc.ref.create(newValue).then(() => {
                      resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  }                })
                .catch(error => {
                  reject(error);
                });
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          });
        });
      };

      var updateAnonymousForumCollectionTitles = function (tags) {
        return new Promise((resolve, reject) => {
          tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
            var promises = collectionTitles.map(collectionTitle => {
              return new Promise((resolve, reject) => {
                admin.firestore().collection(`anonymousforumscollection/${collectionTitle}/forums`).doc(forumId).get().then(doc => {
                  if (doc.exists){
                    doc.ref.update(newValue).then(() => {
                      resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  }
                  else {
                    doc.ref.create(newValue).then(() => {
                      resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  }
                })
                .catch(error => {
                  reject(error);
                });
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          });
        });
      };

      var addToAnonymousForumNoTags = function () {
        return new Promise((resolve, reject) => {
          var forumRef = admin.firestore().collection('anonymousforumsnotags').doc(forumId);
          forumRef.set(newValue).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      };

      var removeAnonymousForumNoTags = function () {
        return new Promise((resolve, reject) => {
          var forumRef = admin.firestore().collection('anonymousforumsnotags').doc(forumId);
          forumRef.get().then(doc => {
            if (doc.exists){
              doc.ref.delete().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else resolve();
          });
        });
      };

      admin.firestore().collection('anonymousforums').doc(forumId).get().then(doc => {
        if (doc.exists){
          doc.ref.update(newValue).then(() => {
            if (tags && tags.length > 0) {
              removeAnonymousForumNoTags().then(() => {
                updateAnonymousForumCollectionTitles(tags).then(() => {
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              })
              .catch(error => {
                reject(error);
              });
            }
            else {
              addToAnonymousForumNoTags().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
          })
          .catch(error => {
            reject(error);
          });
        }
        else {
          var forumRef = admin.firestore().collection('anonymousforums').doc(forumId);
          forumRef.set(newValue).then(() => {
            if (tags && tags.length > 0){
              createAnonymousForumCollectionTitles(tags).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else {
              addToAnonymousForumNoTags().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
          })
          .catch(error => {
            reject(error);
          });
        }
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var removePublicForum = function (tags) {
    return new Promise((resolve, reject) => {
      var removePublicCollectionTitles = function (tags){
        return new Promise((resolve, reject) => {
          if (tags.length > 0){
            tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
              var promises = collectionTitles.map(collectionTitle => {
                return new Promise((resolve, reject) => {
                  var forumRef = admin.firestore().collection(`forumscollection/${collectionTitle}/forums`).doc(forumId);
                  forumRef.get().then(doc => {
                    if (doc.exists){
                      doc.ref.delete().then(() => {
                        resolve();
                      })
                      .catch(error => {
                        reject(error);
                      });
                    }
                    else resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                });
              });

              Promise.all(promises).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          }
          else resolve();
        });
      };

      var removePublicForumNoTags = function () {
        return new Promise((resolve, reject) => {
          var forumRef = admin.firestore().collection('forumsnotags').doc(forumId);
          forumRef.get().then(doc => {
            if (doc.exists){
              doc.ref.delete().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else resolve();
          });
        });
      };

      async.parallel([
        // remove forum
        function (callback) {
          admin.firestore().collection('forums').doc(forumId).get().then(doc => {
            if (doc.exists){
              doc.ref.delete().then(() => {
                callback(null, null);
              })
              .catch(error => {
                callback(error);
              });
            }
            else callback(null, null);
          });
        },
        function (callback){
          if (tags.length > 0){
            removePublicCollectionTitles(tags).then(() => {
              callback(null, null);
            })
            .catch(error => {
              callback(error);
            });
          }
          else {
            removePublicForumNoTags().then(() => {
              callback(null, null);
            })
            .catch(error => {
              callback(error);
            });
          }
        }],
        // optional callback
        function (error, results) {
          if (!error)
            resolve();
          else
            reject(error);
        }
      );
    });
  };

  var removeAnonymousForum = function (tags) {
    return new Promise((resolve, reject) => {
      var removeAnonymousCollectionTitles = function (tags){
        return new Promise((resolve, reject) => {
          if (tags.length > 0){
            tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
              var promises = collectionTitles.map(collectionTitle => {
                return new Promise((resolve, reject) => {
                  var forumRef = admin.firestore().collection(`anonymousforumscollection/${collectionTitle}/forums`).doc(forumId);
                  forumRef.get().then(doc => {
                    if (doc.exists){
                      doc.ref.delete().then(() => {
                        resolve();
                      })
                      .catch(error => {
                        reject(error);
                      });
                    }
                    else resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                });
              });

              Promise.all(promises).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          }
          else resolve();
        });
      };

      var removeAnonymousForumNoTags = function () {
        return new Promise((resolve, reject) => {
          var forumRef = admin.firestore().collection('anonymousforumsnotags').doc(forumId);
          forumRef.get().then(doc => {
            if (doc.exists){
              doc.ref.delete().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else resolve();
          });
        });
      };

      async.parallel([
        // remove forum
        function (callback) {
          admin.firestore().collection('anonymousforums').doc(forumId).get().then(doc => {
            if (doc.exists){
              doc.ref.delete().then(() => {
                callback(null, null);
              })
              .catch(error => {
                callback(error);
              });
            }
            else callback(null, null);
          });
        },
        function (callback){
          if (tags.length > 0){
            removeAnonymousCollectionTitles(tags).then(() => {
              callback(null, null);
            })
            .catch(error => {
              callback(error);
            });
          }
          else {
            removeAnonymousForumNoTags().then(() => {
              callback(null, null);
            })
            .catch(error => {
              callback(error);
            });
          }
        }],
        // optional callback
        function (error, results) {
          if (!error)
            resolve();
          else
            reject(error);
        }
      );
    });
  };

  var getTags = function (){
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${userId}/forums/${forumId}/tags`).get().then(snapshot => {
        var tags = [];

        if (snapshot.size > 0){
          snapshot.docs.forEach(doc => {
            tags.push(doc.data().tag);
          });
          tags.sort();
        }
        resolve(tags);
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return getTags().then(tags => {
    return updateParentForum().then(() => {
      return updateUsersActivityForums().then(() => {
        return updateUserForum(tags).then(() => {
          if (newValue.indexed == true && newValue.type == 'Public'){
            return createOrUpdatePublicForum(tags).then(() => {
              return createOrUpdateAnonymousForum(tags).then(() => {
                return Promise.resolve();
              })
              .catch(error => {
                return Promise.reject(error);
              });
            })
            .catch(error => {
              return Promise.reject(error);
            });
          }
          else {
            return removePublicForum(tags).then(() => {
              return removeAnonymousForum(tags).then(() => {
                return Promise.resolve();
              })
              .catch(error => {
                return Promise.reject(error);
              });
            })
            .catch(error => {
              return Promise.reject(error);
            });
          }
        })
        .catch(error => {
          return Promise.reject(error);
        });
      })
      .catch(error => {
        return Promise.reject(error);
      });
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteUserForum
// ********************************************************************************
exports.deleteUserForum = functions.firestore.document("users/{userId}/forums/{forumId}").onDelete(async (snap, context) => {
  var forum = snap.data();
  var forumId = context.params.forumId;
  var userId = context.params.userId;

  var removeForumTotals = async function () {
    try {
      return await admin.database().ref('totals').child(forumId).remove();
    } catch (error) {
      throw error;
    }
  };

  var removeUserForum = async function (tags) {
    try {
      if (tags && tags.length > 0)
        return await removeUserCollectionTitles(tags);
      else {
        return await removeUserForumNoTags();
      }
    } catch (error) {
      throw error;
    }
  };

  var removeParentForum = async function () {
    try {
      if ((forum.parentId && forum.parentId.length > 0) && (forum.parentUid && forum.parentUid.length > 0)){
        var forumForumSnapshot = await admin.firestore().collection(`users/${forum.parentUid}/forums/${forum.parentId}/forums`).doc(forumId).get();
        var forumForumRef = forumForumSnapshot.ref;

        if (forumForumSnapshot.exists)
          await forumForumRef.delete();

        return;
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var removeForumImages = async function () {
    try {
      const forumImageSnapshot = await admin.firestore().collection(`users/${userId}/forums/${forumId}/images`).get();

      if (forumImageSnapshot.size > 0){
        return await Promise.all(
          forumImageSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var removeForumTags = async function () {
    try {
      const forumTagSnapshot = await admin.firestore().collection(`users/${userId}/forums/${forumId}/tags`).get();

      if (forumTagSnapshot.size > 0){
        return await Promise.all(
          forumTagSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var removeForumForums = async function () {
    try {
      const forumForumSnapshot = await admin.firestore().collection(`users/${userId}/forums/${forumId}/forums`).get();

      if (forumForumSnapshot.size > 0){
        return await Promise.all(
          forumForumSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var removeForumPosts = async function () {
    try {
      const forumPostSnapshot = await admin.firestore().collection(`users/${userId}/forums/${forumId}/posts`).get();

      if (forumPostSnapshot.size > 0){
        return await Promise.all(
          forumPostSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var removeForumPostIds = async function () {
    try {
      const forumPostIdSnapshot = await admin.firestore().collection(`users/${userId}/forums/${forumId}/postids`).get();

      if (forumPostIdSnapshot.size > 0){
        return await Promise.all(
          forumPostIdSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var removeUserForumBreadcrumbs = async function () {
    try {
      const forumBreadcrumbSnapshot = await admin.firestore().collection(`users/${userId}/forums/${forumId}/breadcrumbs`).get();

      if (forumBreadcrumbSnapshot.size > 0){
        return await Promise.all(
          forumBreadcrumbSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var removeUserForumBreadcrumbReferences = async function () {
    try {
      const forumBreadcrumbReferenceSnapshot = await admin.firestore().collection(`users/${userId}/forums/${forumId}/breadcrumbReferences`).get();

      if (forumBreadcrumbReferenceSnapshot.size > 0){
        return await Promise.all(
          forumBreadcrumbReferenceSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var removeUserForumRegistrants = async function () {
    try {
      const registrantSnapshot = await admin.firestore().collection(`users/${userId}/forums/${forumId}/registrants`).get();

      if (registrantSnapshot.size > 0){
        return await Promise.all(
          registrantSnapshot.docs.map(async registrantDoc => {
            var registrant = registrantDoc.data();
            var removeActivity = async function(){
              const activitySnapshot = await admin.firestore().collection(`users/${registrant.uid}/activities`).doc(forumId).get();
              const activityRef = activitySnapshot.ref;

              if (activitySnapshot.exists)
                await activityRef.delete();

              return;
            };

            await removeActivity();
            return await registrantDoc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var removeUserCollectionTitles = async function (tags) {
    try {
      let collectionTitles = await tagUtil.getCollectionTitlesFromTags(tags);

      if (collectionTitles.length > 0){
        return await Promise.all(
          collectionTitles.map(async collectionTitle => {
            const forumSnapshot = await admin.firestore().collection(`users/${userId}/forumscollection/${collectionTitle}/forums`).doc(forumId).get();
            const forumRef = forumSnapshot.ref;

            if (forumSnapshot.exists)
              await forumRef.delete();

            return;
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var removeUserForumNoTags = async function () {
    try {
      var forumSnapshot = await admin.firestore().collection(`users/${userId}/forumsnotags`).doc(forumId).get();
      var forumRef = forumSnapshot.ref;

      if (forumSnapshot.exists)
        await forumRef.delete();

      return;
    } catch (error) {
      throw error;
    }
  };

  var removePublicForum = async function (tags) {
    try {
      var removePublicCollectionTitles = async function (tags) {
        try {
          let collectionTitles = await tagUtil.getCollectionTitlesFromTags(tags);

          if (collectionTitles.length > 0){
            return await Promise.all(
              collectionTitles.map(async collectionTitle => {
                const forumSnapshot = await admin.firestore().collection(`forumscollection/${collectionTitle}/forums`).doc(forumId).get();
                const forumRef = forumSnapshot.ref;

                if (forumSnapshot.exists)
                  await forumRef.delete();

                return;
              })
            );
          }
          else return;
        } catch (error) {
          throw error;
        }
      };

      var removePublicForumNoTags = async function () {
        const forumSnapshot = await admin.firestore().collection('forumsnotags').doc(forumId).get();
        const forumRef = forumSnapshot.ref;

        if (forumSnapshot.exists)
          await forumRef.delete();

        return;
      };

      const forumSnapshot = await admin.firestore().collection('forums').doc(forumId).get();
      const forumRef = forumSnapshot.ref;

      if (forumSnapshot.exists)
        await forumRef.delete();

      if (tags.length > 0)
        return await removePublicCollectionTitles(tags);
      else
        return await removePublicForumNoTags();
    } catch (error) {
      throw error;
    }
  };

  var removeAnonymousForum = async function (tags) {
    try {
      var removeAnonymousCollectionTitles = async function (tags) {
        try {
          let collectionTitles = await tagUtil.getCollectionTitlesFromTags(tags);

          if (collectionTitles.length > 0){
            return await Promise.all(
              collectionTitles.map(async collectionTitle => {
                const forumSnapshot = await admin.firestore().collection(`anonymousforumscollection/${collectionTitle}/forums`).doc(forumId).get();
                const forumRef = forumSnapshot.ref;

                if (forumSnapshot.exists)
                  await forumRef.delete();

                return;
              })
            );
          }
          else return;
        } catch (error) {
          throw error;
        }
      };

      var removeAnonymousForumNoTags = async function () {
        const forumSnapshot = await admin.firestore().collection('anonymousforumsnotags').doc(forumId).get();
        const forumRef = forumSnapshot.ref;

        if (forumSnapshot.exists)
          await forumRef.delete();

        return;
      };

      const forumSnapshot = await admin.firestore().collection('anonymousforums').doc(forumId).get();
      const forumRef = forumSnapshot.ref;

      if (forumSnapshot.exists)
        await forumRef.delete();

      if (tags.length > 0)
        return await removeAnonymousCollectionTitles(tags);
      else
        return await removeAnonymousForumNoTags();
    } catch (error) {
      throw error;
    }
  };

  var removeServiceBlocks = async function () {
    try {
      const serviceBlockSnapshot = await admin.firestore().collection(`users/${userId}/forums/${forumId}/serviceblocks`).get();

      if (serviceBlockSnapshot.size > 0){
        return await Promise.all(
          serviceBlockSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var removeUserBlocks = async function () {
    try {
      const userBlockSnapshot = await admin.firestore().collection(`users/${userId}/forums/${forumId}/userblocks`).get();

      if (userBlockSnapshot.size > 0){
        return await Promise.all(
          userBlockSnapshot.docs.map(async doc => {
            return doc.ref.delete();
          })
        );
      }
      else return;
    } catch (error) {
      throw error;
    }
  };

  var getTags = async function (){
    try {
      const forumTagSnapshot = await admin.firestore().collection(`users/${userId}/forums/${forumId}/tags`).get();
      var tags = [];

      if (forumTagSnapshot.size > 0){
        forumTagSnapshot.docs.forEach(doc => {
          tags.push(doc.data().tag);
        });
        tags.sort();
      }
      return tags;
    } catch (error) {
      throw error;
    }
  };

  try {
    const forumSnapshot = await admin.firestore().collection(`users/${userId}/forums`).select().get();
    const totalSnapshot = await admin.database().ref("totals").child(userId).once("value");

    if (totalSnapshot.exists())
      await admin.database().ref("totals").child(userId).update({ forumCount: forumSnapshot.size });

    let tags = await getTags();

    await removeForumPosts();
    await removeForumPostIds();
    await removeForumImages();
    await removeParentForum();
    await removeForumForums();
    await removeUserForumRegistrants();
    await removeForumTags();
    await removeUserForum(tags);
    await removeUserForumBreadcrumbs();
    await removeUserForumBreadcrumbReferences();
    await removeServiceBlocks();
    await removeUserBlocks();

    if (forum.type == 'Public'){
      await removePublicForum(tags);
      await removeAnonymousForum(tags);
    }
    return await removeForumTotals();
  }
  catch (error) {
    return Promise.reject(error);
  }
});

// ********************************************************************************
// createUserForumBreadcrumb
// ********************************************************************************
exports.createUserForumBreadcrumb = functions.firestore.document("users/{userId}/forums/{parentForumId}/breadcrumbs/{forumId}").onCreate((snap, context) => {
  var breadcrumb = snap.data();
  var userId = context.params.userId;
  var parentForumId = context.params.parentForumId;

  // Create a reference in this forums breadcrumb references table to the parent forum that it is pointing to
  // So that if the parent gets deleted, we know we have to rebuild the breadcrumbs

  var createBreadcrumbReference = function () {
    return new Promise((resolve, reject) => {
      var breadcrumbReferenceRef = admin.firestore().collection(`users/${breadcrumb.uid}/forums/${breadcrumb.forumId}/breadcrumbreferences`).doc(parentForumId);
      breadcrumbReferenceRef.set({
        forumId: parentForumId,
        uid: userId,
        creationDate: FieldValue.serverTimestamp()
      }).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return createBreadcrumbReference().then(() => {
    return Promise.resolve();
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteUserForumBreadcrumb
// ********************************************************************************
exports.deleteUserForumBreadcrumb = functions.firestore.document("users/{userId}/forums/{parentForumId}/breadcrumbs/{forumId}").onDelete((snap, context) => {
  var breadcrumb = snap.data();
  var userId = context.params.userId;
  var parentForumId = context.params.parentForumId;
  var forumId = context.params.forumId;

  var deleteBreadcrumbReference = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${breadcrumb.uid}/forums/${breadcrumb.forumId}/breadcrumbreferences`).doc(parentForumId).get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return deleteBreadcrumbReference().then(() => {
    return Promise.resolve();
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteUserForumBreadcrumbReference
// ********************************************************************************
exports.deleteUserForumBreadcrumbReference = functions.firestore.document("users/{userId}/forums/{parentForumId}/breadcrumbReferences/{forumId}").onDelete((snap, context) => {
  var breadcrumbReference = snap.data();
  var userId = context.params.userId;
  var parentForumId = context.params.parentForumId;

  var updateBreadcrumbs = function () {
    return new Promise((resolve, reject) => {
      var removeOldCrumbs = function () {
        return new Promise((resolve, reject) => {
          admin.firestore().collection(`users/${userId}/forums/${parentForumId}/breadcrumbs`).get().then(snapshot => {
            if (snapshot.size > 0){
              var promises = snapshot.docs.map(doc => {
                return new Promise((resolve, reject) => {
                  doc.ref.delete().then(() => {
                    resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                });
              });

              Promise.all(promises).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      };

      var createNewCrumbs = function () {
        return new Promise((resolve, reject) => {
          var getBreadcrumbPath = function () {
            return new Promise((resolve, reject) => {
              var breadcrumbs = [];

              // we will call this recursively to go backward up the path or tree
              var getCrumb = function (userIdToGet, forumIdToGet) {
                return new Promise((resolve, reject) => {
                  admin.firestore().collection(`users/${userIdToGet}/forums`).doc(forumIdToGet).get().then(doc => {
                    resolve(doc.data());
                  })
                  .catch(error => {
                    reject(error);
                  });
                });
              }

              // recursive function
              var getBreadcrumb = function (userIdToRecurse, forumIdToRecurse) {
                // predicate to decide parent/child relationship
                var predicate = function (tempForum){
                  if (tempForum){
                    // create crumbs
                    breadcrumbs.push(tempForum);

                    // anymore parents?
                    if (tempForum.parentId && tempForum.parentId.length > 0)
                      return getBreadcrumb(tempForum.parentUid, tempForum.parentId); // recurse
                    else
                      return;
                  }
                  else return;
                }

                // get our initial parent then recurse up the tree to the root parent
                return getCrumb(userIdToRecurse, forumIdToRecurse).then(predicate);
              }

              // call the recursive function
              getBreadcrumb(userId, parentForumId).then(result => {
                resolve(breadcrumbs.reverse());
              })
              .catch(error => {
                reject(error);
              });
            });
          };

          getBreadcrumbPath().then(breadcrumbs => {
            if (breadcrumbs && breadcrumbs.length > 0){
              // just create breadcrumbs in a batch
              var batch = admin.firestore().batch();

              for (var i=0; i<breadcrumbs.length; i++){
                var batchRef = admin.firestore().collection(`users/${userId}/forums/${parentForumId}/breadcrumbs`).doc(breadcrumbs[i].forumId);

                batch.set(batchRef, {
                  forumId: breadcrumbs[i].forumId,
                  uid: breadcrumbs[i].uid,
                  sortOrder: i
                });
              }

              batch.commit().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else resolve();
          });
        });
      };

      removeOldCrumbs().then(() => {
        createNewCrumbs().then(() => {
          resolve();
        })
        .catch(error => {
          reject(error);
        });
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  // recreate this forums breadcrumbs as one of the references pointing to one of the breadcrumbs
  // has been removed
  return updateBreadcrumbs().then(() => {
    return Promise.resolve();
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// createUserForumTag
// ********************************************************************************
exports.createUserForumTag = functions.firestore.document("users/{userId}/forums/{forumId}/tags/{tagId}").onCreate((snap, context) => {
  var tag = snap.data();
	var userId = context.params.userId;
	var forumId = context.params.forumId;
  var tagId = context.params.tagId;
  var forum = null;

  var getForum = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${userId}/forums`).doc(forumId).get().then(doc => {
        if (doc.exists)
          forum = doc.data();

        resolve();
      }).catch(error => {
        reject(error);
      });
    });
  };

  var createTagForum = function () {
    return new Promise((resolve, reject) => {
      if (forum){
        var tagForumRef = admin.firestore().collection(`users/${tag.uid}/tags`).doc(tagId).collection('forums').doc(forumId);
        tagForumRef.set({
          forumId: forumId,
          uid: forum.uid
        }).then(() => {
          resolve();
        })
        .catch(error => {
          reject(error);
        });
      }
      else resolve();
    });
  };

  var removeUserForumNoTags = function () {
    return new Promise((resolve, reject) => {
      var forumRef = admin.firestore().collection(`users/${userId}/forumsnotags`).doc(forumId);
      forumRef.get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      });
    });
  };

  var removePublicForumNoTags = function () {
    return new Promise((resolve, reject) => {
      var forumRef = admin.firestore().collection('forumsnotags').doc(forumId);
      forumRef.get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      });
    });
  };

  var removeAnonymousForumNoTags = function () {
    return new Promise((resolve, reject) => {
      var forumRef = admin.firestore().collection('anonymousforumsnotags').doc(forumId);
      forumRef.get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      });
    });
  };

  var createUserForumCollectionTitles = function (tags) {
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var forumRef = admin.firestore().collection(`users/${userId}/forumscollection/${collectionTitle}/forums`).doc(forumId);
              forumRef.set(forum).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var createPublicForumCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var forumRef = admin.firestore().collection(`forumscollection/${collectionTitle}/forums`).doc(forumId);
              forumRef.set(forum).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var createAnonymousForumCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var forumRef = admin.firestore().collection(`anonymousforumscollection/${collectionTitle}/forums`).doc(forumId);
              forumRef.set(forum).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var removeUserForumCollectionTitles = function (tags) {
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var forumRef = admin.firestore().collection(`users/${userId}/forumscollection/${collectionTitle}/forums`).doc(forumId);
              forumRef.get().then(doc => {
                if (doc.exists){
                  doc.ref.delete().then(() => {
                    resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                }
                else resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var removePublicForumCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var forumRef = admin.firestore().collection(`forumscollection/${collectionTitle}/forums`).doc(forumId);
              forumRef.get().then(doc => {
                if (doc.exists){
                  doc.ref.delete().then(() => {
                    resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                }
                else resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var removeAnonymousForumCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var forumRef = admin.firestore().collection(`anonymousforumscollection/${collectionTitle}/forums`).doc(forumId);
              forumRef.get().then(doc => {
                if (doc.exists){
                  doc.ref.delete().then(() => {
                    resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                }
                else resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var getTags = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${userId}/forums/${forumId}/tags`).get().then(snapshot => {
        var tags = [];

        if (snapshot.size > 0){
          snapshot.docs.forEach(doc => {
            tags.push(doc.data().tag);
          });
          tags.sort();
        }
        resolve(tags);
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/forums/${forumId}/tags`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(forumId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(forumId).update({ tagCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  )
  .then(() => {
    return getForum().then(() => {
      return createTagForum().then(() => {
        return removeUserForumNoTags().then(() => {
          return removePublicForumNoTags().then(() => {
            return removeAnonymousForumNoTags().then(() => {
              return getTags().then(tags => {
                if (tags.length == 1){
                  if (forum){
                    return createUserForumCollectionTitles([tag.tag]).then(() => {
                      if (forum.indexed == true && forum.type == 'Public'){
                        return createPublicForumCollectionTitles([tag.tag]).then(() => {
                          return createAnonymousForumCollectionTitles([tag.tag]).then(() => {
                            return Promise.resolve();
                          })
                          .catch(error => {
                            return Promise.reject(error);
                          });
                        })
                        .catch(error => {
                          return Promise.reject(error);
                        });
                      }
                      else return Promise.resolve();
                    })
                    .catch(error => {
                      return Promise.reject(error);
                    });
                  }
                  else return Promise.reject(`Forum with forumId ${forumId} was not found`);
                }
                else {
                  let newTags = [];
                  let oldTags = [];

                  // get tags
                  for (let t in tags) {
                    newTags.push(tags[t]);

                    if (tags[t] != tag.tag)
                      oldTags.push(tags[t]);
                  }
                  newTags.sort();
                  oldTags.sort();

                  return removeUserForumCollectionTitles(oldTags).then(() => {
                    return removePublicForumCollectionTitles(oldTags).then(() => {
                      return removeAnonymousForumCollectionTitles(oldTags).then(() => {
                        if (forum){
                          return createUserForumCollectionTitles(newTags).then(() => {
                            if (forum.indexed == true && forum.type == 'Public'){
                              return createPublicForumCollectionTitles(newTags).then(() => {
                                return createAnonymousForumCollectionTitles(newTags).then(() => {
                                  return Promise.resolve();
                                })
                                .catch(error => {
                                  return Promise.reject(error);
                                });
                              })
                              .catch(error => {
                                return Promise.reject(error);
                              });
                            }
                            else return Promise.resolve();
                          })
                          .catch(error => {
                            return Promise.reject(error);
                          });
                        }
                        else return Promise.reject(`Forum with forumId ${forumId} was not found`);
                      })
                      .catch(error => {
                        return Promise.reject(error);
                      });
                    })
                    .catch(error => {
                      return Promise.reject(error);
                    });
                  })
                  .catch(error => {
                    return Promise.reject(error);
                  });
                }
              })
              .catch(error => {
                return Promise.reject(error);
              });
            })
            .catch(error => {
              return Promise.reject(error);
            });
          })
          .catch(error => {
            return Promise.reject(error);
          });
        })
        .catch(error => {
          return Promise.reject(error);
        });
      })
      .catch(error => {
        return Promise.reject(error);
      });
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteUserForumTag
// ********************************************************************************
exports.deleteUserForumTag = functions.firestore.document("users/{userId}/forums/{forumId}/tags/{tagId}").onDelete((snap, context) => {
  var tag = snap.data();
	var userId = context.params.userId;
	var forumId = context.params.forumId;
  var tagId = context.params.tagId;
  var forum = null;

  var getForum = function (){
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${userId}/forums`).doc(forumId).get().then(doc => {
        if (doc.exists)
          forum = doc.data();

        resolve();
      }).catch(error => {
        reject(error);
      });
    });
  };

  var removeTagForum = function () {
    return new Promise((resolve, reject) => {
      var tagForumRef = admin.firestore().collection(`users/${tag.uid}/tags`).doc(tagId).collection('forums').doc(forumId);
      tagForumRef.get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var addToUserForumNoTags = function () {
    return new Promise((resolve, reject) => {
      var forumRef = admin.firestore().collection(`users/${userId}/forumsnotags`).doc(forumId);
      forumRef.set(forum).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var addToPublicForumNoTags = function () {
    return new Promise((resolve, reject) => {
      var forumRef = admin.firestore().collection('forumsnotags').doc(forumId);
      forumRef.set(forum).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var addToAnonymousForumNoTags = function () {
    return new Promise((resolve, reject) => {
      var forumRef = admin.firestore().collection('anonymousforumsnotags').doc(forumId);
      forumRef.set(forum).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var createUserForumCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var forumRef = admin.firestore().collection(`users/${userId}/forumscollection/${collectionTitle}/forums`).doc(forumId);
              forumRef.set(forum).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var createPublicForumCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var forumRef = admin.firestore().collection(`forumscollection/${collectionTitle}/forums`).doc(forumId);
              forumRef.set(forum).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var createAnonymousForumCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var forumRef = admin.firestore().collection(`anonymousforumscollection/${collectionTitle}/forums`).doc(forumId);
              forumRef.set(forum).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var removeUserForumCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var forumRef = admin.firestore().collection(`users/${userId}/forumscollection/${collectionTitle}/forums`).doc(forumId);
              forumRef.get().then(doc => {
                if (doc.exists){
                  doc.ref.delete().then(() => {
                    resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                }
                else resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var removePublicForumCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var forumRef = admin.firestore().collection(`forumscollection/${collectionTitle}/forums`).doc(forumId);
              forumRef.get().then(doc => {
                if (doc.exists){
                  doc.ref.delete().then(() => {
                    resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                }
                else resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var removeAnonymousForumCollectionTitles = function (tags){
    return new Promise((resolve, reject) => {
      if (tags.length > 0){
        tagUtil.getCollectionTitlesFromTags(tags).then(collectionTitles => {
          var promises = collectionTitles.map(collectionTitle => {
            return new Promise((resolve, reject) => {
              var forumRef = admin.firestore().collection(`anonymousforumscollection/${collectionTitle}/forums`).doc(forumId);
              forumRef.get().then(doc => {
                if (doc.exists){
                  doc.ref.delete().then(() => {
                    resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                }
                else resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      }
      else resolve();
    });
  };

  var getTags = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${userId}/forums/${forumId}/tags`).get().then(snapshot => {
        var tags = [];

        if (snapshot.size > 0){
          snapshot.docs.forEach(doc => {
            tags.push(doc.data().tag);
          });
          tags.sort();
        }
        resolve(tags);
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/forums/${forumId}/tags`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(forumId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(forumId).update({ tagCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  )
  .then(() => {
    return getForum().then(() => {
      return removeTagForum().then(() => {
        return getTags().then(tags => {
          if (tags && tags.length > 0){
            // must be more tags than just the one being removed still remaining
            // so remove the old one's and create new ones with the ones remaining
            var tempTags = [];

            for (var t in tags) {
              if (tags[t] != tag.tag)
                tempTags.push(tags[t]);
            }

            return removeUserForumCollectionTitles(tempTags.concat([tag.tag]).sort()).then(() => {
              return removePublicForumCollectionTitles(tempTags.concat([tag.tag]).sort()).then(() => {
                return removeAnonymousForumCollectionTitles(tempTags.concat([tag.tag]).sort()).then(() => {
                  if (forum){
                    return createUserForumCollectionTitles(tempTags.sort()).then(() => {
                      if (forum.indexed == true && forum.type == 'Public'){
                        return createPublicForumCollectionTitles(tempTags.sort()).then(() => {
                          return createAnonymousForumCollectionTitles(tempTags.sort()).then(() => {
                            return Promise.resolve();
                          })
                          .catch(error => {
                            return Promise.reject(error);
                          });
                        })
                        .catch(error => {
                          return Promise.reject(error);
                        });
                      }
                      else return Promise.resolve();
                    })
                    .catch(error => {
                      return Promise.reject(error);
                    });
                  }
                  else return Promise.reject(`Forum with forumId ${forumId} was not found`);
                })
                .catch(error => {
                  return Promise.reject(error);
                });
              })
              .catch(error => {
                return Promise.reject(error);
              });
            })
            .catch(error => {
              return Promise.reject(error);
            });
          }
          else {
            // must be the current forum tag that was just deleted, just remove collection and add to noTags collection
            return removeUserForumCollectionTitles([tag.tag]).then(() => {
              return removePublicForumCollectionTitles([tag.tag]).then(() => {
                return removeAnonymousForumCollectionTitles([tag.tag]).then(() => {
                  if (forum){
                    return addToUserForumNoTags().then(() => {
                      if (forum.indexed == true && forum.type == 'Public'){
                        return addToPublicForumNoTags().then(() => {
                          return addToAnonymousForumNoTags().then(() => {
                            return Promise.resolve();
                          })
                          .catch(error => {
                            return Promise.reject(error);
                          });
                        })
                        .catch(error => {
                          return Promise.reject(error);
                        });
                      }
                      else return Promise.resolve();
                    })
                    .catch(error => {
                      return Promise.reject(error);
                    });
                  }
                  else return Promise.reject(`Forum with forumId ${forumId} was not found`);
                })
                .catch(error => {
                  return Promise.reject(error);
                });
              })
              .catch(error => {
                return Promise.reject(error);
              });
            })
            .catch(error => {
              return Promise.reject(error);
            });
          }
        })
        .catch(error => {
          return Promise.reject(error);
        });
      })
      .catch(error => {
        return Promise.reject(error);
      });
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// createUserForumPost
// ********************************************************************************
exports.createUserForumPost = functions.firestore.document("users/{userId}/forums/{forumId}/posts/{postId}").onCreate((snap, context) => {
  var post = snap.data();
  var userId = context.params.userId;
  var forumId = context.params.forumId;
  var postId = context.params.postId;

  var createImagePostReference = function (){
    return new Promise((resolve, reject) => {
      var imagePostRef = admin.firestore().collection(`users/${post.imageUid}/images`).doc(post.imageId).collection('posts').doc(postId);
      imagePostRef.set({
        postId: postId,
        forumId: forumId,
        forumUid: post.forumUid
      }).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var updateRegistrantActivityLastUpdateDate = function (){
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${post.forumUid}/forums/${forumId}/registrants`)
        .get().then(snapshot => {
          if (snapshot.size > 0){
            var promises = snapshot.docs.map(doc => {
              return new Promise((resolve, reject) => {
                var activityRef = admin.firestore().collection(`users/${doc.data().uid}/activities`).doc(forumId);

                activityRef.get().then(activityDoc => {
                  if (activityDoc.exists){
                    var activity = activityDoc.data();

                    if (activity.receivePosts == true && activity.uid != post.forumUid){
                      activityDoc.ref.update({
                        highlightPost: true,
                        lastUpdateDate: FieldValue.serverTimestamp()
                      }).then(() => {
                        resolve();
                      }).catch(error => {
                        reject(error);
                      });
                    }
                    else resolve();
                  }
                  else resolve();
                })
                .catch(error => {
                  reject(error);
                });
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          }
          else resolve();
        }
      );
    });
  };

  var sendForumPostPushNotification = function (){
    return new Promise((resolve, reject) => {
      // get the forum
      admin.firestore().collection(`users/${userId}/forums`).doc(forumId).get().then(forumDoc => {
        if (forumDoc.exists){
          var forum = forumDoc.data();

          // get registrants
          admin.firestore().collection(`users/${userId}/forums/${forumId}/registrants`)
            .get().then(snapshot => {
              if (snapshot.size > 0){
                var promises = snapshot.docs.map(registrantDoc => {
                  return new Promise((resolve, reject) => {
                    // get the user
                    var userRef = admin.firestore().collection('users').doc(registrantDoc.data().uid);

                    userRef.get().then(userDoc => {
                      if (userDoc.exists){
                        var user = userDoc.data();

                        if (user.receivePushNotifications && user.receiveForumPostNotifications){
                          // get their fcm token
                          var fcmTokenRef = admin.firestore().collection('fcmTokens').doc(user.uid);

                          fcmTokenRef.get().then(fcmTokenDoc => {
                            if (fcmTokenDoc.exists){
                              var fcmToken = fcmTokenDoc.data();

                              var sendForumNotification = function (url) {
                                return new Promise((resolve, reject) => {
                                  var payload = {
                                    notification: {
                                      title: `'${forum.title}' has received a new post`,
                                      body: post.message,
                                      // click_action: `http://localhost:4200/forum/detail/${forum.forumId}?forumId=${forum.forumId}`,
                                      // click_action: `https://eleutherios-4dd64.firebaseapp.com/forum/detail/${forum.forumId}?forumId=${forum.forumId}`,
                                      click_action: `https://eleutherios.org.nz/forum/detail/${forum.forumId}?forumId=${forum.forumId}&postId=${snap.key}`,
                                      // data: {
                                      //   type: 'Forum',
                                      //   forumId: forum.forumId
                                      // }
                                      icon: url.length > 0 ? url : ''
                                    }
                                  };

                                  // send push notification
                                  admin.messaging().sendToDevice(fcmToken.token, payload).then(() => {
                                    console.log('sent payload ' + JSON.stringify(payload));
                                    resolve();
                                  })
                                  .catch(error => {
                                    console.log('error sending payload ' + error);
                                    reject(error);
                                  });
                                });
                              };

                              var getDefaultForumImageUrl = function (){
                                return new Promise((resolve, reject) => {
                                  var forumImageRef = admin.firestore().collection(`users/${userId}/forums/${forumId}/images`).where('default', '==', true).limit(1);

                                  forumImageRef.get().then(snapshot => {
                                    if (snapshot.size > 0){
                                      var file = bucket.file(snapshot.docs[0].data().smallUrl)
                                      const config = {
                                        action: 'read',
                                        expires: '03-17-2025'
                                      };

                                      file.getSignedUrl(config, (url) => {
                                        resolve(url);
                                      })
                                      .catch(error => {
                                        reject(error);
                                      });
                                    }
                                    else resolve();
                                  })
                                  .catch(error => {
                                    reject(error);
                                  });
                                });
                              };

                              getDefaultForumImageUrl(url => {
                                sendForumNotification(url).then(() => {
                                  resolve();
                                })
                                .catch(error => {
                                  reject(error);
                                });
                              })
                              .catch(error => {
                                reject(error);
                              });
                            }
                            else {
                              console.log('no fcmToken found for user ' + user.uid);
                              resolve();
                            }
                          })
                          .catch(error => {
                            reject(error);
                          });
                        }
                        else resolve();
                      }
                      else resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  });
                });

                Promise.all(promises).then(() => {
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              }
              else resolve();
            })
            .catch(error => {
              reject(error);
            }
          );
        }
        else resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/forums/${forumId}/posts`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(forumId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(forumId).update({ postCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    if (post.imageId && post.imageId.length > 0){
      return createImagePostReference().then(() => {
        return updateRegistrantActivityLastUpdateDate().then(() => {
          return sendForumPostPushNotification().then(() => {
            return Promise.resolve();
          })
          .catch(error => {
            return Promise.reject(error);
          });
        })
        .catch(error => {
          return Promise.reject(error);
        });
      })
      .catch(error => {
        callback (error);
      });
    }
    else {
      return updateRegistrantActivityLastUpdateDate().then(() => {
        return sendForumPostPushNotification().then(() => {
          return Promise.resolve();
        })
        .catch(error => {
          return Promise.reject(error);
        });
      })
      .catch(error => {
        return Promise.reject(error);
      });
    }
  });
});

// ********************************************************************************
// deleteUserForumPost
// ********************************************************************************
exports.deleteUserForumPost = functions.firestore.document("users/{userId}/forums/{forumId}/posts/{postId}").onDelete((snap, context) => {
  var post = snap.data();
  var userId = context.params.userId;
  var forumId = context.params.forumId;
  var postId = context.params.postId;

  var removeImagePostReference = function (){
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${post.imageUid}/images`).doc(post.imageId).collection('posts').doc(postId).get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/forums/${forumId}/posts`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(forumId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(forumId).update({ postCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    if (post.imageId && post.imageId.length > 0){
      return removeImagePostReference().then(() => {
        return Promise.resolve();
      })
      .catch(error => {
        return Promise.reject(error);
      });
    }
    else return Promise.resolve();
  });
});

// ********************************************************************************
// createUserImagePost
// ********************************************************************************
exports.createUserImagePost = functions.firestore.document("users/{userId}/images/{imageId}/posts/{postId}").onCreate((snap, context) => {
  var post = snap.data();
  var userId = context.params.userId;
  var imageId = context.params.imageId;
  var postId = context.params.postId;

  return admin.firestore().collection(`users/${userId}/images/${imageId}/posts`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(imageId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(imageId).update({ postCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ********************************************************************************
// deleteUserImagePost
// ********************************************************************************
exports.deleteUserImagePost = functions.firestore.document("users/{userId}/images/{imageId}/posts/{postId}").onDelete((snap, context) => {
  var post = snap.data();
  var userId = context.params.userId;
  var imageId = context.params.imageId;
  var postId = context.params.postId;

  return admin.firestore().collection(`users/${userId}/images/${imageId}/posts`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(imageId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(imageId).update({ postCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ********************************************************************************
// createUserForumPostImage
// ********************************************************************************
exports.createUserForumPostImage = functions.firestore.document("users/{userId}/forums/{forumId}/posts/{postId}/images/{imageId}").onCreate((snap, context) => {
	var image = snap.data();
  var userId = context.params.userId;
	var forumId = context.params.forumId;
	var postId = context.params.postId;
	var imageId = context.params.imageId;
	var bucket = admin.storage().bucket();
	var tinyImageStorageFilePath = `forums/${forumId}/posts/${postId}/images/tiny_${imageId}.jpg`;
	var smallImageStorageFilePath = `forums/${forumId}/posts/${postId}/images/thumb_${imageId}.jpg`;
	var mediumImageStorageFilePath = `forums/${forumId}/posts/${postId}/images/medium_${imageId}.jpg`;
	var largeImageStorageFilePath = `forums/${forumId}/posts/${postId}/images/large_${imageId}.jpg`;
	var tinyLocation = `gs://${bucket.name}/${tinyImageStorageFilePath}`;
	var smallLocation = `gs://${bucket.name}/${smallImageStorageFilePath}`;
	var mediumLocation = `gs://${bucket.name}/${mediumImageStorageFilePath}`;
	var largeLocation = `gs://${bucket.name}/${largeImageStorageFilePath}`;

	var copyTinyImage = function () {
		return new Promise((resolve, reject) => {
			var file = bucket.file(image.tinyUrl);

			file.copy(tinyLocation).then((destinationFile, apiResponse) => {
				console.log(`copied ${image.tinyUrl} to ${tinyLocation}`);
				resolve();
			})
			.catch(error => {
				reject(error);
			});
		});
	};

	var copySmallImage = function () {
		return new Promise((resolve, reject) => {
			var file = bucket.file(image.smallUrl);

			file.copy(smallLocation).then((destinationFile, apiResponse) => {
				console.log(`copied ${image.smallUrl} to ${smallLocation}`);
				resolve();
			})
			.catch(error => {
				reject(error);
			});
		});
	};

	var copyMediumImage = function () {
		return new Promise((resolve, reject) => {
			var file = bucket.file(image.mediumUrl);

			file.copy(mediumLocation).then((destinationFile, apiResponse) => {
				console.log(`copied ${image.mediumUrl} to ${mediumLocation}`);
				resolve();
			})
			.catch(error => {
				reject(error);
			});
		});
	};

	var copyLargeImage = function () {
		return new Promise((resolve, reject) => {
			var file = bucket.file(image.largeUrl);

			file.copy(largeLocation).then((destinationFile, apiResponse) => {
				console.log(`copied ${image.largeUrl} to ${largeLocation}`);
				resolve();
			})
			.catch(error => {
				reject(error);
			});
		});
  };

  var updatePostImage = function () {
    return new Promise((resolve, reject) => {
			var postImageRef = admin.firestore().collection(`users/${userId}/forums/${forumId}/posts/${postId}/images`).doc(imageId);
      postImageRef.update({
        tinyUrl: tinyImageStorageFilePath,
        smallUrl: smallImageStorageFilePath,
        mediumUrl: mediumImageStorageFilePath,
        largeUrl: largeImageStorageFilePath
      }).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
		});
  };

  return copyTinyImage().then(() => {
    return copySmallImage().then(() => {
      return copyMediumImage().then(() => {
        return copyLargeImage().then(() => {
          return updatePostImage().then(() => {
            return Promise.resolve();
          }).catch(error => {
            return Promise.reject(error);
          });
        }).catch(error => {
          return Promise.reject(error);
        });
      }).catch(error => {
        return Promise.reject(error);
      });
    }).catch(error => {
      return Promise.reject(error);
    });
  }).catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteUserForumPostImage
// ********************************************************************************
exports.deleteUserForumPostImage = functions.firestore.document("users/{userId}/forums/{forumId}/posts/{postId}/images/{imageId}").onDelete((snap, context) => {
  var image = snap.data();
  var userId = context.params.userId;
  var forumId = context.params.forumId;
	var postId = context.params.postId;
  var imageId = context.params.imageId;
  var bucket = admin.storage().bucket();

  var removeImage = function (path){
    return new Promise((resolve, reject) => {
      bucket.file(path).exists().then(exists => {
        if (exists){
          bucket.file(path).delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  return removeImage(image.tinyUrl).then(() => {
    return removeImage(image.smallUrl).then(() => {
      return removeImage(image.mediumUrl).then(() => {
        return removeImage(image.largeUrl).then(() => {
          return Promise.resolve();
        }).catch(error => {
          return Promise.reject(error);
        });
      }).catch(error => {
        return Promise.reject(error);
      });
    }).catch(error => {
      return Promise.reject(error);
    });
  }).catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// createUserImageForum
// ********************************************************************************
exports.createUserImageForum = functions.firestore.document("users/{userId}/images/{imageId}/forums/{forumId}").onCreate((snap, context) => {
  var forum = snap.data();
  var userId = context.params.userId;
  var imageId = context.params.imageId;
  var forumId = context.params.forumId;

  return admin.firestore().collection(`users/${userId}/images/${imageId}/forums`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(imageId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(imageId).update({ forumCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ********************************************************************************
// deleteUserImageForum
// ********************************************************************************
exports.deleteUserImageForum = functions.firestore.document("users/{userId}/images/{imageId}/forums/{forumId}").onDelete((snap, context) => {
  var forum = snap.data();
  var userId = context.params.userId;
  var imageId = context.params.imageId;
  var forumId = context.params.forumId;

  return admin.firestore().collection(`users/${userId}/images/${imageId}/forums`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(imageId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(imageId).update({ forumCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  );
});

// ********************************************************************************
// createUserForumImage
// ********************************************************************************
exports.createUserForumImage = functions.firestore.document("users/{userId}/forums/{forumId}/images/{imageId}").onCreate(async (snap, context) => {
  var image = snap.data();
  var forumImageRef = snap.ref;
	var userId = context.params.userId;
	var forumId = context.params.forumId;
	var imageId = context.params.imageId;
  var bucket = admin.storage().bucket();

	var tinyImageStorageFilePath = `users/${userId}/forums/${forumId}/images/tiny_${imageId}.jpg`;
	var smallImageStorageFilePath = `users/${userId}/forums/${forumId}/images/thumb_${imageId}.jpg`;
	var mediumImageStorageFilePath = `users/${userId}/forums/${forumId}/images/medium_${imageId}.jpg`;
	var largeImageStorageFilePath = `users/${userId}/forums/${forumId}/images/large_${imageId}.jpg`;
	var tinyLocation = `gs://${bucket.name}/${tinyImageStorageFilePath}`;
	var smallLocation = `gs://${bucket.name}/${smallImageStorageFilePath}`;
	var mediumLocation = `gs://${bucket.name}/${mediumImageStorageFilePath}`;
	var largeLocation = `gs://${bucket.name}/${largeImageStorageFilePath}`;

  var copyImage = async function (url, location){
    try {
      var file = bucket.file(url);
      return await file.copy(location);
    } catch (error) {
      throw error;
    }
  }

  var createUserImageForum = async function () {
    try {
      var forumSnapshot = await admin.firestore().collection(`users/${userId}/images/${imageId}/forums`).doc(forumId).get();
      var forumRef = forumSnapshot.ref;
      return await forumRef.set({ forumId: forumId });
    } catch (error) {
      throw error;
    }
  };

  try {
    // repopulate image count
    const imageSnapshot = await admin.firestore().collection(`users/${userId}/forums/${forumId}/images`).select().get();
    const totalSnapshot = await admin.database().ref("totals").child(forumId).once("value");

    if (totalSnapshot.exists())
      await admin.database().ref("totals").child(forumId).update({ imageCount: imageSnapshot.size });

    let urlsToCreate = [
      { url: image.tinyUrl, location: tinyLocation },
      { url: image.smallUrl, location: smallLocation },
      { url: image.mediumUrl, location: mediumLocation },
      { url: image.largeUrl, location: largeLocation }
    ];

    await Promise.all(
      urlsToCreate.map(async obj => {
        return copyImage(obj.url, obj.location);
      })
    );

    // create image reference to this forum
    return await createUserImageForum();
  }
  catch (error) {
    return Promise.reject(error);
  }
});

// ********************************************************************************
// deleteUserForumImage
// ********************************************************************************
exports.deleteUserForumImage = functions.firestore.document("users/{userId}/forums/{forumId}/images/{imageId}").onDelete(async (snap, context) => {
  var image = snap.data();
	var userId = context.params.userId;
  var forumId = context.params.forumId;
  var imageId = context.params.imageId;
  var bucket = admin.storage().bucket();

  var removeImage = async function (path) {
    try {
      const bucketExists = await bucket.file(path).exists();

      if (bucketExists)
        await bucket.file(path).delete();

      return;
    } catch (error) {
      throw error;
    }
  };

  var deleteUserImageForum = async function () {
    try {
      var forumSnapshot = await admin.firestore().collection(`users/${userId}/images/${imageId}/forums`).doc(forumId).get();
      var forumRef = forumSnapshot.ref;

      if (forumSnapshot.exists)
        await forumRef.delete();

      return;
    } catch (error) {
      throw error;
    }
	};

  try {
    // repopulate image count
    const imageSnapshot = await admin.firestore().collection(`users/${userId}/forums/${forumId}/images`).select().get();
    const totalSnapshot = await admin.database().ref("totals").child(forumId).once("value");

    if (totalSnapshot.exists())
      await admin.database().ref("totals").child(forumId).update({ imageCount: imageSnapshot.size });

    let urlsToRemove = [image.tinyUrl, image.smallUrl, image.mediumUrl, image.largeUrl];

    await Promise.all(
      urlsToRemove.map(async url => {
        return removeImage(url);
      })
    );

    // remove images reference to this forum
    return await deleteUserImageForum();
  }
  catch (error) {
    return Promise.reject(error);
  }
});

// ********************************************************************************
// createUserForumRegistrant
// ********************************************************************************
exports.createUserForumRegistrant = functions.firestore.document("users/{userId}/forums/{forumId}/registrants/{registrantId}").onCreate((snap, context) => {
  var registrant = snap.data();
  var userId = context.params.userId;
  var forumId = context.params.forumId;
  var registrantId = context.params.registrantId;

  var createRegistrantTotals = function () {
    return new Promise((resolve, reject) => {
      admin.database().ref('totals').child(registrantId).set({
        registrantCount: 0,
        forumCount: 0
      })
      .then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  // store reference to registrant in the users activity
  var createRegistrantActivity = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${userId}/forums`).doc(forumId).get().then(forumDoc => {
        var addRegistrantActivity = function () {
          return new Promise((resolve, reject) => {
            var tempRegistrant = {
              registrantId: registrantId,
              creationDate: FieldValue.serverTimestamp()
            };

            admin.firestore().collection(`users/${registrant.uid}/activities/${forumId}/registrants`).doc(registrantId).set(tempRegistrant).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          });
        };

        if (forumDoc.exists){
          var forum = forumDoc.data();

          // make sure registrant user has an entry for this forum in their activities before adding them
          admin.firestore().collection(`users/${registrant.uid}/activities`).doc(forumId).get().then(activityDoc => {
            if (activityDoc.exists){
              addRegistrantActivity().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else {
              // create activity entry and then add registrant
              var activity = {
                forumId: forumId,
                parentId: forum.parentId,
                parentUid: forum.parentUid,
                uid: forum.uid,
                type: forum.type,
                title: forum.title,
                title_lowercase: forum.title_lowercase,
                description: forum.description,
                website: forum.website,
                indexed: forum.indexed,
                includeDescriptionInDetailPage: forum.includeDescriptionInDetailPage,
                includeImagesInDetailPage: forum.includeImagesInDetailPage,
                includeTagsInDetailPage: forum.includeImagesInDetailPage,
                forumLastUpdateDate: forum.lastUpdateDate,
                forumCreationDate: forum.creationDate,
                receivePosts: false,
                highlightPost: false,
                lastUpdateDate: FieldValue.serverTimestamp(),
                creationDate: FieldValue.serverTimestamp()
              };

              admin.firestore().collection(`users/${registrant.uid}/activities`).doc(forumId).set(activity).then(() => {
                addRegistrantActivity().then(() => {
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              })
              .catch(error => {
                reject(error);
              });
            }
          })
          .catch(error => {
            reject(error);
          });
        }
        else reject('Forum with forumId ' + forumId + ' does not exist');
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  // store reference so services know which forums they are serving in
  var createWhereServing = function () {
    return new Promise((resolve, reject) => {
      var whereServing = {
        forumId: forumId,
        uid: userId,
        creationDate: FieldValue.serverTimestamp()
      };

      admin.firestore().collection(`users/${registrant.uid}/services/${registrant.serviceId}/whereservings`).doc(forumId).set(whereServing).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var validateDefaultRegistrant = function () {
    return new Promise((resolve, reject) => {
      if (registrant.default == true){
        admin.firestore().collection(`users/${userId}/forums/${forumId}/registrants`).where("uid", "==", registrant.uid).where("default", "==", true)
          .get().then(snapshot => {
            if (snapshot.size > 1){
              // must be more than one registrant belonging to this user serving in this forum
              // reset their other registrant defaults to false, as user can only have one default registrant
              // serving in the same forum
              var promises = snapshot.docs.map(doc => {
                return new Promise((resolve, reject) => {
                  var data = doc.data();

                  if (data.serviceId != registrant.serviceId){
                    data.default = false; // reset
                    doc.ref.update(data).then(() => {
                      resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  }
                  else resolve();
                });
              });

              Promise.all(promises).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else resolve();
          }
        );
      }
      else resolve();
    });
  };

  return admin.firestore().collection(`users/${userId}/forums/${forumId}/registrants`).select()
		.get().then(snapshot => {
			return admin.database().ref("totals").child(forumId).once("value", totalSnapshot => {
				if (totalSnapshot.exists())
					return admin.database().ref("totals").child(forumId).update({ registrantCount: snapshot.size });
				else
					return Promise.resolve();
			});
		}
	).then(() => {
    return createRegistrantTotals().then(() => {
      return createRegistrantActivity().then(() => {
        return createWhereServing().then(() => {
          return validateDefaultRegistrant().then(() => {
            return Promise.resolve();
          })
          .catch(error => {
            return Promise.reject(error);
          });
        })
        .catch(error => {
          return Promise.reject(error);
        });
      })
      .catch(error => {
        return Promise.reject(error);
      });
    })
    .catch(error => {
      return Promise.reject(error);
    });
	})
	.catch(error => {
		return Promise.reject(error);
	});
});

// ********************************************************************************
// updateUserForumRegistrant
// ********************************************************************************
exports.updateUserForumRegistrant = functions.firestore.document('users/{userId}/forums/{forumId}/registrants/{registrantId}').onUpdate((change, context) => {
  var newValue = change.after.data();
  var previousValue = change.before.data();
  var userId = context.params.userId;
  var forumId = context.params.forumId;
  var registrantId = context.params.registrantId;

  return admin.firestore().collection(`users/${userId}/forums/${forumId}/registrants`).select()
		.get().then(snapshot => {
			return admin.database().ref("totals").child(forumId).once("value", totalSnapshot => {
				if (totalSnapshot.exists())
					return admin.database().ref("totals").child(forumId).update({ registrantCount: snapshot.size });
				else
					return Promise.resolve();
			});
		}
	).then(() => {
    // check if the default flag is being set
    if (newValue.default == true && previousValue.default == false){
      // find any other services that the user of the registrant is managing in the forum and that has it's default setting set to true
      // and change it to false.  End users of forums or ones that are various pseudonymns in the same forum or request can only have
      // one default registrant at a time.
      return admin.firestore().collection(`users/${userId}/forums/${forumId}/registrants`).where("uid", "==", newValue.uid).where("default", "==", true)
        .get().then(snapshot => {
          if (snapshot.size > 1){ // must be more than one registrant belonging to this user
            var promises = snapshot.docs.map(doc => {
              return new Promise((resolve, reject) => {
                var data = doc.data();

                if (data.serviceId != newValue.serviceId){
                  data.default = false;

                  doc.ref.update(data).then(() => {
                    resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                }
                else resolve();
              });
            });

            return Promise.all(promises).then(() => {
              return Promise.resolve();
            })
            .catch(error => {
              return Promise.reject(error);
            });
          }
          else return Promise.resolve();
        }
      );
    }
    else return Promise.resolve();
	})
	.catch(error => {
		return Promise.reject(error);
	});
});

// ********************************************************************************
// deleteUserForumRegistrant
// ********************************************************************************
exports.deleteUserForumRegistrant = functions.firestore.document("users/{userId}/forums/{forumId}/registrants/{registrantId}").onDelete((snap, context) => {
  var registrant = snap.data();
  var userId = context.params.userId;
  var forumId = context.params.forumId;
  var registrantId = context.params.registrantId;

  var removeRegistrantTotals = function () {
    return new Promise((resolve, reject) => {
      admin.database().ref('totals').child(registrantId).remove(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  var removeWhereServing = function () {
    return new Promise((resolve, reject) => {
      var whereServingRef = admin.firestore().collection(`users/${registrant.uid}/services/${registrant.serviceId}/whereservings`).doc(forumId);

      whereServingRef.get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      });
    });
  };

  var removeActivityRegistrant = function(){
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${registrant.uid}/activities/${forumId}/registrants`).doc(registrantId).get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/forums/${forumId}/registrants`).select()
		.get().then(snapshot => {
			return admin.database().ref("totals").child(forumId).once("value", totalSnapshot => {
				if (totalSnapshot.exists())
					return admin.database().ref("totals").child(forumId).update({ registrantCount: snapshot.size });
				else
					return Promise.resolve();
			});
		}
	).then(() => {
    return removeWhereServing().then(() => {
      return removeActivityRegistrant().then(() => {
        return removeRegistrantTotals().then(() => {
          return Promise.resolve();
        })
        .catch(error => {
          return Promise.reject(error);
        });
      })
      .catch(error => {
        return Promise.reject(error);
      });
    })
    .catch(error => {
      return Promise.reject(error);
    });
	})
	.catch(error => {
		return Promise.reject(error);
	});
});

// ********************************************************************************
// createUserForumForum
// ********************************************************************************
exports.createUserForumForum = functions.firestore.document("users/{userId}/forums/{parentForumId}/forums/{forumId}").onCreate((snap, context) => {
  var forum = snap.data();
  var userId = context.params.userId;
  var parentForumId = context.params.parentForumId;
  var forumCount = 0;

  var updateBreadcrumbs = function (userIdCrumb, forumId) {
    return new Promise((resolve, reject) => {
      var removeOldCrumbs = function () {
        return new Promise((resolve, reject) => {
          admin.firestore().collection(`users/${userIdCrumb}/forums/${forumId}/breadcrumbs`).get().then(snapshot => {
            if (snapshot.size > 0){
              var promises = snapshot.docs.map(doc => {
                return new Promise((resolve, reject) => {
                  doc.ref.delete().then(() => {
                    resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                });
              });

              Promise.all(promises).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      };

      var createNewCrumbs = function () {
        return new Promise((resolve, reject) => {
          var getBreadcrumbPath = function () {
            return new Promise((resolve, reject) => {
              var breadcrumbs = [];

              // we will call this recursively to go backward up the path or tree
              var getCrumb = function (userIdToGet, forumIdToGet) {
                return new Promise((resolve, reject) => {
                  admin.firestore().collection(`users/${userIdToGet}/forums`).doc(forumIdToGet).get().then(doc => {
                    resolve(doc.data());
                  })
                  .catch(error => {
                    reject(error);
                  });
                });
              }

              // recursive function
              var getBreadcrumb = function (userIdToRecurse, forumIdToRecurse) {
                // predicate to decide parent/child relationship
                var predicate = function (tempForum){
                  if (tempForum){
                    // create crumbs
                    breadcrumbs.push(tempForum);

                    // anymore parents?
                    if (tempForum.parentId && tempForum.parentId.length > 0)
                      return getBreadcrumb(tempForum.parentUid, tempForum.parentId); // recurse
                    else
                      return;
                  }
                  else return;
                }

                // get our initial parent then recurse up the tree to the root parent
                return getCrumb(userIdToRecurse, forumIdToRecurse).then(predicate);
              }

              // Start our recursive function
              getBreadcrumb(userIdCrumb, forumId).then(result => {
                resolve(breadcrumbs.reverse());
              })
              .catch(error => {
                reject(error);
              });
            });
          };

          getBreadcrumbPath().then(breadcrumbs => {
            if (breadcrumbs && breadcrumbs.length > 0){
              // just create breadcrumbs in a batch
              var batch = admin.firestore().batch();

              for (var i=0; i<breadcrumbs.length; i++){
                var batchRef = admin.firestore().collection(`users/${userIdCrumb}/forums/${forumId}/breadcrumbs`).doc(breadcrumbs[i].forumId);

                batch.set(batchRef, {
                  forumId: breadcrumbs[i].forumId,
                  uid: breadcrumbs[i].uid,
                  sortOrder: i
                });
              }

              batch.commit().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else resolve();
          });
        });
      };

      removeOldCrumbs().then(() => {
        createNewCrumbs().then(() => {
          resolve();
        })
        .catch(error => {
          reject(error);
        });
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/forums/${parentForumId}/forums`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(parentForumId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(parentForumId).update({ forumCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return updateBreadcrumbs(forum.uid, forum.forumId).then(() => {
      return Promise.resolve();
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// updateUserForumForum
// ********************************************************************************
exports.updateUserForumForum = functions.firestore.document("users/{userId}/forums/{parentForumId}/forums/{forumId}").onUpdate((change, context) => {
  var newValue = change.after.data();
  var previousValue = change.before.data();
  var userId = context.params.userId;
  var parentForumId = context.params.parentForumId;
  var forumId = context.params.forumId;

  var updateBreadcrumbs = function (userIdCrumb, forumId) {
    return new Promise((resolve, reject) => {
      var removeOldCrumbs = function () {
        return new Promise((resolve, reject) => {
          admin.firestore().collection(`users/${userIdCrumb}/forums/${forumId}/breadcrumbs`).get().then(snapshot => {
            if (snapshot.size > 0){
              var promises = snapshot.docs.map(doc => {
                return new Promise((resolve, reject) => {
                  doc.ref.delete().then(() => {
                    resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                });
              });

              Promise.all(promises).then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else resolve();
          })
          .catch(error => {
            reject(error);
          });
        });
      };

      var createNewCrumbs = function () {
        return new Promise((resolve, reject) => {
          var getBreadcrumbPath = function () {
            return new Promise((resolve, reject) => {
              var breadcrumbs = [];

              // we will call this recursively to go backward up the path or tree
              var getCrumb = function (userIdToGet, forumIdToGet) {
                return new Promise((resolve, reject) => {
                  admin.firestore().collection(`users/${userIdToGet}/forums`).doc(forumIdToGet).get().then(doc => {
                    resolve(doc.data());
                  })
                  .catch(error => {
                    reject(error);
                  });
                });
              }

              // recursive function
              var getBreadcrumb = function (userIdToRecurse, forumIdToRecurse) {
                // predicate to decide parent/child relationship
                var predicate = function (tempForum){
                  if (tempForum){
                    // create crumbs
                    breadcrumbs.push(tempForum);

                    // anymore parents?
                    if (tempForum.parentId && tempForum.parentId.length > 0)
                      return getBreadcrumb(tempForum.parentUid, tempForum.parentId); // recurse
                    else
                      return;
                  }
                  else return;
                }

                // get our initial parent then recurse up the tree to the root parent
                return getCrumb(userIdToRecurse, forumIdToRecurse).then(predicate);
              }

              // call the recursive function
              getBreadcrumb(userIdCrumb, forumId).then(result => {
                resolve(breadcrumbs.reverse());
              })
              .catch(error => {
                reject(error);
              });
            });
          };

          getBreadcrumbPath().then(breadcrumbs => {
            if (breadcrumbs && breadcrumbs.length > 0){
              // just create breadcrumbs in a batch
              var batch = admin.firestore().batch();

              for (var i=0; i<breadcrumbs.length; i++){
                var batchRef = admin.firestore().collection(`users/${userIdCrumb}/forums/${forumId}/breadcrumbs`).doc(breadcrumbs[i].forumId);

                batch.set(batchRef, {
                  forumId: breadcrumbs[i].forumId,
                  uid: breadcrumbs[i].uid,
                  sortOrder: i
                });
              }

              batch.commit().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            }
            else resolve();
          });
        });
      };

      removeOldCrumbs().then(() => {
        createNewCrumbs().then(() => {
          resolve();
        })
        .catch(error => {
          reject(error);
        });
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/forums/${parentForumId}/forums`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(parentForumId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(parentForumId).update({ forumCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return updateBreadcrumbs(newValue.uid, newValue.forumId).then(() => {
      return Promise.resolve();
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteUserForumForum
// ********************************************************************************
exports.deleteUserForumForum = functions.firestore.document("users/{userId}/forums/{parentForumId}/forums/{forumId}").onDelete((snap, context) => {
  var forum = snap.data();
  var userId = context.params.userId;
  var parentForumId = context.params.parentForumId;

  // this forum is no longer a child of any parent so remove its breadcrumbs
  var removeBreadCrumbs = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${forum.uid}/forums/${forum.forumId}/breadcrumbs`).get().then(snapshot => {
        if (snapshot.size > 0){
          var promises = snapshot.docs.map(doc => {
            return new Promise((resolve, reject) => {
              doc.ref.delete().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/forums/${parentForumId}/forums`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(parentForumId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(parentForumId).update({ forumCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return removeBreadCrumbs().then(() => {
      return Promise.resolve();
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// createUserServiceBlock
// ********************************************************************************
exports.createUserServiceBlock = functions.firestore.document("users/{userId}/serviceblocks/{serviceBlockId}").onCreate((snap, context) => {
  // serviceBlockId: 99999
  // serviceId: 99999 - service being blocked
  // serviceUid: 9999 - owner of service
  // forumId: 99999 - forum doing the blocking
  // forumUid: 9999 - owner of the forum
  var serviceBlock = snap.data();
  var userId = context.params.userId;
  var serviceBlockId = context.params.serviceBlockId;

  var removeRegistrant = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${serviceBlock.forumUid}/forums/${serviceBlock.forumId}/registrants`)
        .where('serviceId', '==', serviceBlock.serviceId)
        .get().then(snapshot => {
          if (snapshot.size > 0) {
            var promises = snapshot.docs.map(doc => {
              return new Promise((resolve, reject) => {
                doc.ref.delete().then(() => {
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          }
          else resolve();
        })
        .catch(error => {
          reject(error);
        }
      );
    });
  };

  // users/${userId}/forums/${forumId}/serviceblocks
  var createUserForumServiceBlock = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${serviceBlock.forumUid}/forums/${serviceBlock.forumId}/serviceblocks`).doc(serviceBlockId).set(serviceBlock).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/serviceblocks`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(userId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(userId).update({ serviceBlockCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return removeRegistrant().then(() => {
      return createUserForumServiceBlock().then(() => {
        return Promise.resolve();
      })
      .catch(error => {
        return Promise.reject(error);
      });
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteUserServiceBlock
// ********************************************************************************
exports.deleteUserServiceBlock = functions.firestore.document("users/{userId}/serviceblocks/{serviceBlockId}").onDelete((snap, context) => {
  var serviceBlock = snap.data();
  var userId = context.params.userId;
  var serviceBlockId = context.params.serviceBlockId;

  // users/${userId}/forums/${forumId}/serviceblocks
  var removeUserForumServiceBlock = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${serviceBlock.forumUid}/forums/${serviceBlock.forumId}/serviceblocks`).doc(serviceBlockId).get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      });
    });
  };

  return admin.firestore().collection(`users/${userId}/serviceblocks`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(userId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(userId).update({ serviceBlockCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return removeUserForumServiceBlock().then(() => {
      return Promise.resolve();
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// createUserServiceUserBlock
// ********************************************************************************
exports.createUserServiceUserBlock = functions.firestore.document("users/{parentUserId}/serviceuserblocks/{serviceUserBlockId}").onCreate((snap, context) => {
  // userId: 99999
  var serviceUserBlock = snap.data();
  var parentUserId = context.params.parentUserId;
  var serviceUserBlockId = context.params.serviceUserBlockId;

  var removeRegistrants = function () {
    return new Promise((resolve, reject) => {
      // go through each of the user forums and
      // remove the user being blocked from them
      admin.firestore().collection(`users/${parentUserId}/forums`)
        .get().then(snapshot => {
          if (snapshot.size > 0) {
            var promises = snapshot.docs.map(doc => {
              return new Promise((resolve, reject) => {
                admin.firestore().collection(`users/${parentUserId}/forums/${doc.data().forumId}/registrants`)
                  .where('uid', '==', serviceUserBlock.userId)
                  .get().then(registrantSnapshot => {
                    if (registrantSnapshot.size > 0) {
                      var promises = registrantSnapshot.docs.map(doc => {
                        return new Promise((resolve, reject) => {
                          doc.ref.delete().then(() => {
                            resolve();
                          })
                          .catch(error => {
                            reject(error);
                          });
                        });
                      });

                      Promise.all(promises).then(() => {
                        resolve();
                      })
                      .catch(error => {
                        reject(error);
                      });
                    }
                    else resolve();
                  })
                  .catch(error => {
                    reject(error);
                  }
                );
              });
            });

            Promise.all(promises).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          }
          else resolve();
        })
        .catch(error => {
          reject(error);
        }
      );
    });
  };

  // users/${userId}/forums/${forumId}/userblocks
  var createUserForumServiceUserBlock = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${serviceUserBlock.forumUid}/forums/${serviceUserBlock.forumId}/userblocks`).doc(serviceUserBlockId).set(serviceUserBlock).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return admin.firestore().collection(`users/${parentUserId}/serviceuserblocks`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(parentUserId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(parentUserId).update({ serviceUserBlockCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return createUserForumServiceUserBlock().then(() => {
      return removeRegistrants().then(() => {
        return Promise.resolve();
      })
      .catch(error => {
        return Promise.reject(error);
      });
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteUserServiceUserBlock
// ********************************************************************************
exports.deleteUserServiceUserBlock = functions.firestore.document("users/{parentUserId}/serviceuserblocks/{serviceUserBlockId}").onDelete((snap, context) => {
  var serviceUserBlock = snap.data();
  var parentUserId = context.params.parentUserId;
  var serviceUserBlockId = context.params.serviceUserBlockId;

  // users/${userId}/forums/${forumId}/userblocks
  var removeUserForumServiceUserBlock = function () {
    return new Promise((resolve, reject) => {
      admin.firestore().collection(`users/${serviceUserBlock.forumUid}/forums/${serviceUserBlock.forumId}/userblocks`).doc(serviceUserBlockId).get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      });
    });
  };

  return admin.firestore().collection(`users/${parentUserId}/serviceuserblocks`).select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child(parentUserId).once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child(parentUserId).update({ serviceUserBlockCount: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return removeUserForumServiceUserBlock().then(() => {
      return Promise.resolve();
    })
    .catch(error => {
      return Promise.reject(error);
    });
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// PUBLIC SERVICE

// ********************************************************************************
// createService
// ********************************************************************************
exports.createService = functions.firestore.document("services/{serviceId}").onCreate((snap, context) => {
  var service = snap.data();
  var serviceId = context.params.serviceId;

  return admin.firestore().collection('services').select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child('service').once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child('service').update({ count: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return Promise.resolve();
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteService
// ********************************************************************************
exports.deleteService = functions.firestore.document("services/{serviceId}").onDelete((snap, context) => {
  var service = snap.data();
  var serviceId = context.params.serviceId;

  return admin.firestore().collection('services').select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child('service').once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child('service').update({ count: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return Promise.resolve();
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// PUBLIC FORUM

// ********************************************************************************
// createForum
// ********************************************************************************
exports.createForum = functions.firestore.document("forums/{forumId}").onCreate((snap, context) => {
  var forum = snap.data();
  var forumId = context.params.forumId;

  return admin.firestore().collection('forums').select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child('forum').once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child('forum').update({ count: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return Promise.resolve();
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteForum
// ********************************************************************************
exports.deleteForum = functions.firestore.document("forums/{forumId}").onDelete((snap, context) => {
  var forum = snap.data();
  var forumId = context.params.forumId;

  return admin.firestore().collection('forums').select()
    .get().then(snapshot => {
      return admin.database().ref("totals").child('forum').once("value", totalSnapshot => {
        if (totalSnapshot.exists())
          return admin.database().ref("totals").child('forum').update({ count: snapshot.size });
        else
          return Promise.resolve();
      });
    }
  ).then(() => {
    return Promise.resolve();
  })
  .catch(error => {
    return Promise.reject(error);
  });
});

// PUBLIC TAGS

// ********************************************************************************
// createTag
// ********************************************************************************
exports.createTag = functions.firestore.document('tags/{tagId}').onCreate((snap, context) => {
  var tag = snap.data();
  var tagId = context.params.tagId;

  var createTagTotals = function () {
    return new Promise((resolve, reject) => {
      admin.database().ref('totals').child(tagId).set({
        forumCount: 0,
        serviceCount: 0,
        notificationCount: 0
      })
      .then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  };

  return createTagTotals().then(function(){
    return Promise.resolve();
  })
  .catch(function(error){
    return Promise.reject(error);
  });
});

// ********************************************************************************
// deleteTag
// ********************************************************************************
exports.deleteTag = functions.firestore.document('tags/{tagId}').onDelete((snap, context) => {
  var tag = snap.data();
  var tagId = context.params.tagId;

  var removeTagTotals = function () {
    return new Promise((resolve, reject) => {
      admin.database().ref('totals').child(tagId).remove(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  return removeTagTotals().then(function(){
    return Promise.resolve();
  })
  .catch(function(error){
    return Promise.reject(error);
  });
});
