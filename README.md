# freecodecamp-book-trading-app (Work in progress)
This is a node.js app that allows users to manager their books, view other user's books, and to request trades with the other users. The app uses stormpath for user management, and mongodb for the database.

You can view the live demo here: https://stark-basin-36303.herokuapp.com/

### The Web App Does the Following:
* I can view all books posted by every user.
* I can add a new book.
* I can update my settings to store my full name, city, and state.
* I can propose a trade and wait for the other user to accept the trade.

Link to the freecodecamp project - https://www.freecodecamp.com/challenges/manage-a-book-trading-club

### Running the app locally:
In order to run the app locally, you will need to update index.js with your Stormpath API credentials, and Mongodb URL. These are both free, and if you deploy the app to heroku, these are both available as addons.

Once this is done, just run 'npm install', and then 'npm start', or 'nodemon' to start the application.
