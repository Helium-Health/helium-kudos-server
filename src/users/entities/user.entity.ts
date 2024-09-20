import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  //   ManyToMany,
  //   JoinTable,
} from 'typeorm';

export enum UserRole {
  Admin = 'admin',
  User = 'user',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string; // This will be the auto-generated primary key

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  picture?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.User,
  })
  role: UserRole;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  // Relationships (assuming 'recognition', 'milestone', 'coin' are other entities)
  //   @ManyToMany(() => Recognition)
  //   @JoinTable()
  //   recognitions: Recognition[];

  //   @ManyToMany(() => Milestone)
  //   @JoinTable()
  //   milestones: Milestone[];

  //   @ManyToMany(() => Coin)
  //   @JoinTable()
  //   coins: Coin[];
}
