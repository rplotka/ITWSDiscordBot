const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL);

sequelize.authenticate()
    .then(() => {
        console.log("Connected to Database.")
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });