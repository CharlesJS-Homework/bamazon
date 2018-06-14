/* eslint-env node, es6 */

const mysql = require('mysql');
const inquirer = require('inquirer');

const HOST = '127.0.0.1';
const PORT = 3306;
const USER = 'root';
const PASSWD = 'SammySquirrel';

const conn = mysql.createConnection({
  host: HOST,
  port: PORT,
  user: USER,
  password: PASSWD,
});

function connectToDB() {
  function connect() {
    return new Promise((resolve, reject) => {
      conn.connect((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  function create() {
    return new Promise((resolve, reject) => {
      conn.query('CREATE DATABASE IF NOT EXISTS bamazon;', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  function use() {
    return new Promise((resolve, reject) => {
      conn.query('USE bamazon;', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  return connect().then(create).then(use);
}

function createTable() {
  const check = () => new Promise((resolve) => {
    conn.query('SELECT 1 FROM products LIMIT 1;', err => resolve(!err));
  });

  const create = () => new Promise((resolve, reject) => {
    const query = `
      CREATE TABLE products(
        item_id INTEGER AUTO_INCREMENT NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        department_name VARCHAR(255) NOT NULL,
        price DOUBLE NOT NULL,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(item_id)
      );
    `;

    conn.query(query, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

  const insertMock = () => new Promise((resolve, reject) => {
    const query = `
        INSERT INTO products
          (product_name, department_name, price, stock_quantity)
        VALUES
          ("Magnamocks TV", "Entertainment", 500, 5),
          ("XMocks 360", "Entertainment", 200, 3),
          ("Gillette Mock 3", "Hygeine", 10, 10),
          ("MockBook Pro", "Computing", 1500, 7),
          ("Retro 70s Pet Mock", "Junk", 5, 4),
          ("Mocksie", "Soda", 1, 15),
          ("Mocktain Dew", "Soda", 1, 25),
          ("Mock Pot", "Kitchen", 70, 10),
          ("Mockto G", "Cellular", 300, 2),
          ("Hydmocks", "Cookies", 3.75, 7),
          ("Clormocks", "Cleaning Supplies", 1.25, 10);
      `;

    conn.query(query, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

  return check().then((exists) => {
    if (exists) {
      return null;
    }

    return create().then(insertMock);
  });
}

function getProducts() {
  return new Promise((resolve, reject) => {
    conn.query('SELECT * FROM products', (err, response) => {
      if (err) {
        reject(err);
      } else {
        resolve(response);
      }
    });
  });
}

function askForProduct(products) {
  const choices = products.filter(each => each.stock_quantity > 0).map(each => ({
    name: `${each.product_name} (${each.department_name}): $${each.price} (${each.stock_quantity} available)`,
    value: each,
    short: each.product_name,
  }));

  if (choices.length === 0) {
    throw(Error("Oh no! We're plum out of product!"));
  }

  return inquirer.prompt({
    message: 'Which product would you like to buy?',
    type: 'list',
    name: 'choice',
    choices,
  }).then(response => response.choice);
}

function askForQuantity(product) {
  return inquirer.prompt({
    message: 'How many would you like to buy?',
    type: 'input',
    name: 'quantity',
  }).then((response) => {
    if (!response.quantity || response.quantity === '') {
      throw Error("It appears you're not really serious about this.");
    }

    const quantity = parseInt(response.quantity);

    if (quantity > product.stock_quantity) {
      console.log("We don't have that many!");

      return askForQuantity(product);
    } else if (quantity === 0 || quantity === NaN) {
      throw Error('Well all righty, then.');
    } else if (quantity < 0) {
      throw Error("It seems you're not ***positive*** that you want this product.");
    } else {
      return { product, quantity };
    }
  });
}

function fulfill(args) {
  return new Promise((resolve, reject) => {
    const product = args.product;
    const quantity = args.quantity;

    conn.query('UPDATE products SET stock_quantity = stock_quantity - ? WHERE item_id = ?', [quantity, product.item_id], (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`Transaction complete! You are now $${product.price * quantity} poorer.`);
        resolve();
      }
    });
  });
}

connectToDB()
  .then(createTable)
  .then(getProducts)
  .then(products => askForProduct(products))
  .then(product => askForQuantity(product))
  .then(fulfill)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => conn.end());
