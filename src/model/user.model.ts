import User from "./interface/User.interface";
import { Schema, model } from 'mongoose'
const User_Scheme = new Schema<User>({
    userName: {
        type: String,
        required: true,
        unique: true
    },
    passWord: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    lastname: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        required: true,
    },
    avatar: {
        type: String,
        required: true,
    },
});

const User = model<User>('User', User_Scheme);