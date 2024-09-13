import { Document, Types } from 'mongoose';
export type UserDocument = Document & User;
export declare class User {
    email: string;
    name: string;
    role: string;
    verified: boolean;
    recognitions: Types.Array<Types.ObjectId>;
    milestones: Types.Array<Types.ObjectId>;
    coins: Types.Array<Types.ObjectId>;
}
export declare const UserSchema: import("mongoose").Schema<User, import("mongoose").Model<User, any, any, any, Document<unknown, any, User> & User & {
    _id: Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, User, Document<unknown, {}, import("mongoose").FlatRecord<User>> & import("mongoose").FlatRecord<User> & {
    _id: Types.ObjectId;
}>;
