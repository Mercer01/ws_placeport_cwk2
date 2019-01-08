'use strict';

const express = require('express');
const imager = require('./imager');
const url = require("url");
const app = express();


app.use(express.static(__dirname + '/public'))

/**
 * Stats object setup to be used as a global variable for multiple 
 * statistic recording functionality
 */
let stats = {
	"recent_path": [],
	"recent_text": [],
	"recent_sizes": [],
	"top_sizes": [],
	"top_referrers": [],
	"hits": []
}

/**
* General server setup logic + serving of static files index.html and the public/stats file
*/
app.get('/', function (req, res) {
	res.sendFile(__dirname + "/public/")
})

app.get('/stats', function (req, res) {
	res.sendFile(__dirname + "/public/stats.html")
})

// start the server
app.listen(8080, "localhost", (err) => {
	if (err) console.error('error starting server', err);
	else console.log('Server Started on port 8080');
});



/**
 *    ####  ########### #####  #    # ###### #####     ###### #    # #    #  ####  ##### #  ####  #    #  ####
 *   #      #           #    # #    # #      #    #    #      #    # ##   # #    #   #   # #    # ##   # #
 *    ####  ##########  #    # #    # #####  #    #    #####  #    # # #  # #        #   # #    # # #  #  ####
 *        # #           #####  #    # #      #####     #      #    # #  # # #        #   # #    # #  # #      #
 *   #    # #           #   #   #  #  #      #   #     #      #    # #   ## #    #   #   # #    # #   ## #    #
 *    ####  ########### #    #   ##   ###### #    #    #       ####  #    #  ####    #   #  ####  #    #  ####
 */

/**
 * API end point for requesting content from the imager library
 */
app.get('/img/:width/:height', async (req, res) => {
	let width = req.params.width;
	let height = req.params.height;

	if (width % 1 !== 0 || height % 1 !== 0) {
		res.status(400).send("You need a number");
		return
	};

	if (width > 2000 || height > 2000) {
		res.status(403).send("Invalid size")
		return
	};
	if (width <= 0 || height <= 0) {
		res.status(400).send("Invalid Size")
		return
	};

	width = Number(width);
	height = Number(height);

	let square = req.query.square;
	if (square <= "0") {
		res.status(400).send("Please set the square size to above 0")
		return
	}

	if (square % 1 == 0) {
		square = Number(square);
	} else {
		if (square !== undefined) {
			res.status(400).send("Whole numbers only past the wall, in trumpscript we only do whole numbers")
			return
		}
	}
	
	let text = req.query.text;
	/**
	 * Encoding, the URL so that %20 etc is handled for input mapping
	 * However this is only required for text and square
	 * Two options exist for text, as I have to handle if its the only one vs being an addition to square
	 */
	let parsed_url = url.parse(req.url, true)
	let encoded_url = []
	encoded_url.push(parsed_url.pathname)
	if (parsed_url.query.square !== undefined) {
		encoded_url.push(`?square=${parsed_url.query.square}`)
		if (parsed_url.query.text !== undefined) {
			encoded_url.push(`&text=${encodeURIComponent(parsed_url.query.text)}`)
		}
	} else {
		if (parsed_url.query.text !== undefined) {
			encoded_url.push(`?text=${encodeURIComponent(parsed_url.query.text)}`)
		}
	}
	let encoded = encoded_url.join("");
	
	recent_path(encoded);
	
	recent_sizes(width,height);
	
	top_sizes(width,height);

	recent_text(parsed_url);

	top_referrers(req)
	// Whenever this is called an the current timestamp stored in ms is stored to use to calculate the requests per (s)
	stats.hits.push(Date.now()/1000)

	imager.sendImage(res, width, height, square, text)
})

/**
 * Get all the recent sizes api end point
 * This object is stored in reverse, so has to be reversed then unreversed
 */
app.get("/stats/paths/recent",(req, res) => {
	res.send(stats.recent_path.reverse())
	stats.recent_path.reverse() //Handle the issue of reference rather than value.
})

/**
 * Get all the recent sizes api end point
 * This object is stored in reverse, so has to be reversed then unreversed
 */
app.get("/stats/sizes/recent", (req, res) => {
	res.send(stats.recent_sizes.reverse())
	stats.recent_sizes.reverse()
})
/**
 * Get all the recent texts api end point
 * This object is stored in reverse, so has to be reversed then unreversed
 */
app.get("/stats/texts/recent", (req, res) => {
	res.send(stats.recent_text.reverse())
	stats.recent_text.reverse()
})
/**
 * End point that get the top 10 sizes
 * Array has to be reversed inorder have data as requested, and information is sliced 
 * to remove greater than 10 objects
 */
app.get("/stats/sizes/top", (req, res) => {
	let sorted = stats.top_sizes.sort(sortByProperty("n"))
	res.send(sorted.reverse().slice(0, 10))
})

/**
 * End point that get the top 10 referers
 * Array has to be reversed inorder have data as requested, and information is sliced 
 * to remove greater than 10 objects
 */
app.get("/stats/referrers/top", (req, res) =>{
	let sorted = stats.top_referrers.sort(sortByProperty("n"))
	res.send(sorted.reverse().slice(0, 10))
})

/**
 * End point for the sending of the time informatio
 * When ever the api end point is triggerd all of the hits in the past 5, 10 and 15 seconds are
 * calculated and then returned. This calculation is only done on request to save on time proocessing time
 * so it is only done when needed.
 */
app.get("/stats/hits", (req, res) => {
	const now = Date.now()/1000
	let time_json = [{
			"title": '5s',
			"count": 0
		},
		{
			"title": '10s',
			"count": 0
		},
		{
			"title": '15s',
			"count": 0
		}
	]
	stats.hits.forEach((hit, i) => {
		if (hit > now - 5) {
			time_json[0].count += 1
		}
		if (hit > now - 10) {
			time_json[1].count += 1
		}
		if (hit > now - 15) {
			time_json[2].count += 1
		}
	});
	res.send(time_json)
})
/* 
* End point for /stats that restets the entire 
*/
app.delete("/stats", (req, res) => {
	stats = {
		"recent_path": [],
		"recent_text": [],
		"recent_sizes": [],
		"top_sizes": [],
		"top_referrers": [],
		"hits": []
	}
	res.send("Sucessfully reset stats objec")
})
/*
* This method takes a give object in an array and sorts the list by that property
* In this case I sort two objects to get the top most results to present
*/
let sortByProperty = (property) => {
	return function (x, y) {
		return ((x[property] === y[property]) ? 0 : ((x[property] > y[property]) ? 1 : -1));
	};
};

/**
 * @param  {} encoded_url
 * Takes encoded url and stores the information in an array of the latest ones,
 * This information is stored in the opposite to how its required, however when used a .reverse()
 * is used to flip the object to make it standard
 */
function recent_path(encoded_url) {
	stats.recent_path.forEach((value, i) => {
		if (value === encoded_url) {
			stats.recent_path.splice(i, 1)
		}
	});
	if (stats.recent_path.length >= 10) {
		stats.recent_path.shift()
	}
	stats.recent_path.push(encoded_url)
}

/**
 * @param  {integer} width
 * @param  {integer} height
 * Recent sizes does simlar to the recnt_path however only uses the width and height objects
 * when storing the data that is taken from the call
*/
function recent_sizes(width, height) {
	let width_height = {
		"w": width,
		"h": height
	}
	stats.recent_sizes.forEach((value, i) => {
		if (value.w == width_height.w && value.h == width_height.h) {
			stats.recent_sizes.splice(i, 1)
		}
	});
	if (stats.recent_sizes.length >= 10) {
		stats.recent_sizes.shift()
	}
	stats.recent_sizes.push(width_height)
}

/**
 * @param  {} width
 * @param  {} height
 * Adds the objects to the top_sizes stats object for storing of stats
 */
function top_sizes(width,height) {
	let in_list = false;
	for (const value of stats.top_sizes) {
		if (value.w == width && value.h == height) {
			value.n += 1;
			in_list = true;
			break; //Done to save time not going through a loop that has found the value
		}
	};
	if (!in_list) {
		let stats_container = {
			w: width,
			h: height,
			n: 1
		}
		stats.top_sizes.push(stats_container)
	}
  }

/**
 * @param  {string} url
 * This will extract the text from the incoming url storing the information.
 * Then checking if the text is already in the system or unique, incramenting 
 * the pointer if unique if not creating a new object
 */
function recent_text(url) {
	let parsed_query_text = url.query.text;
	if (parsed_query_text !== undefined) {
		stats.recent_text.forEach((value, i) => {
			if (value == parsed_query_text) {
				stats.recent_text.splice(i, 1)
			}
		});
		if (stats.recent_text.length >= 10) {
			stats.recent_text.shift()
		}
		stats.recent_text.push(parsed_query_text)
	}
  }

/**
 * @param  {object} req
 * Handle Referes headers by parsing them and then counting their occurances
 * It will check if the referer has already been added to the object and if so
 * incrament the value by one.
 * Otherwise it will add a new recrord of the reference
*/
function top_referrers(req) { 

	let referer = req.get("Referrer")
	if (referer !== undefined) {
		let inlist = false;
		for(const value of stats.top_referrers) {
			if (value.ref == referer) {
				value.n += 1;
				inlist = true;
				break; //Done to save time not going through a loop that has found the value
			}
		};
		if (!inlist) {
			let referrers_counter = {
				ref: referer,
				n: 1
			}
			stats.top_referrers.push(referrers_counter)
		}
	}
}