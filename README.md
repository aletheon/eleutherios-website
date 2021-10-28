# Eleutherios

Eleutherios (https://eleutherios.org.nz) is a global cooperative forum or two-way communications network that enables service providers (people or business) to cooperate or serve one another online.

![1b](./src/assets/1b.png)

It does this by decoupling or scaling the customer request, forum or conversation, that the vertical domain or service layer is having with one another.

![2b](./src/assets/2b.png)

Such as an individual buying a can of corn from a retailer.

![3b](./src/assets/3b.png)

Or a manufacturer buying a ton of corn from a farmer.

![4c](./src/assets/4b.png)

Unfortunately this way of serving customer requests, doesn't scale or the request can only travel in one direction.

![5c](./src/assets/5b.png)

Eleutherios changes this behavior by decoupling the customer request from the services layer and turning it into a forum or conversation, that can travel in both directions.

Now, if Mary Smith and the Retailer needed the help of the farmer?  Then they could scale their forum and invite the farmer to join their conversation.  Likewise if the farmer and manufacturer needed the help of the retailer, then they could scale their forum and invite the retailer to join their conversation.

Eleutherios provides basic features, but will evolve to provide a governance or policies layer, B2B API to enable service providers to run services or provide data from their own servers.  AI, Analytics + Reporting, book-keeping etc.

#### Features:

* Tags for filtering forums or services
* Forum in forum
* Blocking to prevent unwanted services or users from serving in forums, they have been asked not to serve in or for requesting services, they have been asked not to request
* Service ratings/reviews
* B2B Payments

Eleutherios is built with Node.js, Firestore and Angular.

# Installation and Setup

### 0. Prerequisites

```bash
i.    a new or existing firebase application with at least a google, facebook or email passwordless provider
ii.   node.js (https://nodejs.org/en/)
iii.  firebase cli (npm install -g firebase-tools)
iv.   angular cli (npm install -g @angular/cli)
```

### 1. Cloning Eleutherios

The easiest way to get Eleutherios up and running is to clone it to your machine.

```bash
i.    git clone https://github.com/aletheon/eleutherios-website.git eleutherios-website
ii.   run npm install to install dependencies
iii.  create a new folder in your src folder called environments to hold your environment (environment.prod.ts and environment.ts) variables:
```

```bash
export const environment = {
  production: true | false,
  firebase: {
    apiKey: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    authDomain: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    databaseURL: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    projectId: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    storageBucket: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    messagingSenderId: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    appId: "xxxxxxxxxxxxx",
    measurementId: "xxxxxxxxxxxxx"
  },
  googleTagManagerId: "xxxxxxxxxxxxx",
  stripeTestKey: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  url: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
};
```
```bash
iv.   firebase login
v.    firebase init
```

### 2. Login to firebase and deploy functions folder

Eleutherios uses functions to modify the behavior of the system and its data before or after it is created, updated or deleted in the system.  If you are planning on doing work on the backend API, then you should install firebase functions to help you test your work before committing it.

```bash
i.   cd functions
ii.  npm install
iii. firebase deploy --only functions
```

### 3. Setup firebase

It's important to setup your firebase backend to work with the source code.

```bash
i.    enable firebase authentication (email/password, google, facebook)
ii.   create a totals table in firebase not firestore, with the following default structure:
        totals
          forum
            count: 0
          service
            count: 0
          user
            count: 0
```

### 4. Run Eleutherios

Once you have setup Eleutherios you can run it on your local server.

If you have any difficulties setting Eleutherios up then please contact me so I can help you.

```bash
i.    ng serve
ii.   go to http://localhost:4200/
```

### 5. Contribute

Help fix bugs or resolve issues.
https://github.com/aletheon/eleutherios-website/issues

Make a donation to the Eleutherios open source project. https://opencollective.com/eleutherios
