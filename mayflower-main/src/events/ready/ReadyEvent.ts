import { Event } from '@a-djs-handler/framework';

export default class ReadyEvent extends Event {
	constructor() {
		super('ready');
	}

	async run() {
		console.log('Bot has logged in.');
	}
}
