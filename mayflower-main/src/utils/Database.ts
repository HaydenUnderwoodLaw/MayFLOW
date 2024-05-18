import { connect } from 'mongoose';

(async () => {
	await connect(process.env.MONGO_URL!);

	console.log('Connected to Database');
})();
