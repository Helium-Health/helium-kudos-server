import { UserService } from '../services/UserService';
import { User } from '../schemas/UserSchema';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    create(createUserDto: Partial<User>): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findAll(): Promise<User[]>;
    update(id: string, updateUserDto: Partial<User>): Promise<User | null>;
    delete(id: string): Promise<User | null>;
}
