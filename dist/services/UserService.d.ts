import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/UserSchema';
export declare class UserService {
    private userModel;
    constructor(userModel: Model<UserDocument>);
    createUser(data: Partial<User>): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findAll(): Promise<User[]>;
    updateUser(id: string, updateData: Partial<User>): Promise<User | null>;
    deleteUser(id: string): Promise<User | null>;
}
