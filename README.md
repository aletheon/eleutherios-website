# Eleutherios

Eleutherios (https://eleutherios.org.nz) is a global cooperative forum or digital sociopolitical or economic system, that enables humankind to self-organize with one another at scale through the internet.

![futureOverview](./src/assets/futureOverview.jpg)

It does this by scaling the request layer (customer) horizontally over the service layer (business) to enable, more than one service provider to be able to participate in the same forum or request (B2B)

![currentOverview](./src/assets/currentOverview.jpg)

In the old school analogue sociopolitical or economic system it's the opposite. Only one service provider can participate in the forum or request (B2C).

There are many problems that can occur from this type of behavior. Such as competition among service providers; an inherent cost to acquire customers; and the inability for service providers to able to share data or policies with one another.

![subforum](./src/assets/subforum.jpg)

Eleutherios changes this behavior by making the forum or request scalable. In this example Hire My Farmer wants to use the Barley yield data, that they're getting from GYGA to share with another service provider.

They can click on the plus button to create a sub-forum in the Barley yield data forum and include the service provider they want to share the data with.

![breadcrumb](./src/assets/breadcrumb.jpg)

The main advantage to doing this is that it separates the concerns of each service provider. Service providers are able to take the responsibility for managing their request or concerns of their customers.

In the above example, the Barley yield farming forum is a child of the Barley yield data forum. Service providers can navigate their way through the conversation using a virtual breadcrumb.

![priskaService](./src/assets/priskaService.jpg)

The current version of Eleutherios provides basic tooling such as creating a forum, creating a sub-forum, creating a service, searching for forums or services, and purchasing services.

Over-time Eleutherios will evolve into a PAAS (Platform-as-a-service) or cloud architecture, enabling service providers to operate their business at scale.

#### Current features:

- Tags for filtering forums or services
- Forum in forum
- Blocking to prevent unwanted services or users from serving in forums, they have been asked not to serve in or for requesting services, they have been asked not to request
- Service ratings/reviews
- B2B Payments

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

Eleutherios uses functions to modify the behavior of the system and its data before or after it is created, updated or deleted in the system. If you are planning on doing work on the backend API, then you should install firebase functions to help you test your work before committing it.

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
