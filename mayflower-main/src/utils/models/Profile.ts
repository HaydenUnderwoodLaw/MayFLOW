import { Schema, model } from 'mongoose';

export interface IProfile {
	userId: string;
	username: string;
	avatar: string;
	banner?: string;
	bio?: string;
	verified: boolean;
	tweets: number;
}

const Profile = new Schema<IProfile>({
	userId: { type: String, required: true, unique: true },
	username: { type: String, required: true },
	banner: { type: String },
	bio: { type: String },
	avatar: { type: String, required: true },
	verified: { type: Boolean, default: false },
	tweets: { type: Number, default: 0 },
});

export default model<IProfile>('profile', Profile);
