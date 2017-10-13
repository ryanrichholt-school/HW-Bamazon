var mysql = require('mysql');
var inquirer = require('inquirer');
require('console.table');

var connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    database: 'bamazon',
})

connection.connect(function(err, res){
    if(err){
        throw err;
    } else {
        console.log('Database connection established!');
        home();
    }
});

var message = null

function home(){
    var queryString = 'SELECT * FROM products';
    connection.query(queryString, function(err, res){
        if(err){
            throw err;
        } else {
            console.table('Items for sale', res);
            if(message){
            	console.log(message);
            	message = null;
            }
            promptForAction();
        }
    });
}

function buyItem(item_id, quantity){
  	connection.beginTransaction(function(err){
  		if(err){
  			throw err;
  		};

		var queryString = "SELECT * FROM products WHERE ?";
		var query = mysql.format(queryString, {item_id: item_id});

		connection.query(query, function(err, res){
			if(err){
				connection.rollback(function(){
					throw err;
				});
			} else {

				if(res.length > 1){
					throw 'Too many results returned!'
				} else if (res.length < 1){
					connection.rollback(function(){
						message = 'Error: item not found!';
						home();
					});
				} else {

					var item_data = res[0]
					var queryString = "UPDATE products SET stock_quantity = stock_quantity - "+quantity+" WHERE ?";
		  			var query = mysql.format(queryString, {item_id: item_id});

					connection.query(query, function(err, res){
						if(err){
							connection.rollback(function(){
								message = 'Error: Quantity unavailable!';
								home();
							});
						} else {
							connection.commit(function(err){
								if(err){
									connection.rollback(function(){
										throw err;
									});
								};
								var cost = (quantity * parseFloat(item_data.price)).toFixed(2);
								message = 'Purchsed ' + item_data.product_name + '('+ quantity+')';
								message += '\nTotal cost: ' + String(cost);
								home();				
							});
						};
					});
				};
			};
  		});
  	});
}

function promptForAction(){
    inquirer.prompt([
        {
            name: 'item_id',
            type: 'input',
            message: 'Enter item_id of item you would like to purchase:',
        },
        {
        	name: 'quantity',
        	type: 'input',
        	message: 'How many?',
        },
    ]).then(function(answers){
    	try{
    		buyItem(answers.item_id, answers.quantity);	
    	} catch(err) {
    		console.log('Error: Item unavailable!');
    		home();
    	}      
    })
}

