/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
/* eslint-disable no-extend-native */
interface String {
	toProperCase(): string;
	isEmpty(): boolean;
}

interface Array<T> {
	random(): T;
}

String.prototype.toProperCase = function toProperCase() {
	return this.toLowerCase().replace(/(^|[s.])[^s.]/gm, (s) => s.toUpperCase());
};

Array.prototype.random = function random() {
	return this[Math.floor(Math.random() * this.length)];
};

/**
 * Checks whether a text is empty.
 * @returns {boolean}
 */

String.prototype.isEmpty = function isEmpty(): boolean {
	return this.length === 0 || !this.trim();
};
