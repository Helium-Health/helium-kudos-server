const fieldsToMerge = ['team', 'gender', 'nationality', 'joinDate', 'dateOfBirth'];

module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    const session = await client.startSession();
    session.startTransaction();

    console.log('Migration Up starting...');

    const updatedAccounts = [];

    try {
      // Find all users
      const users = await db.collection('users').find({}).toArray();

      const emailGroups = users.reduce((acc, user) => {
        const lowerEmail = user.email.toLowerCase();
        if (!acc[lowerEmail]) {
          acc[lowerEmail] = [];
        }
        acc[lowerEmail].push(user);
        return acc;
      }, {});

      for (const [email, duplicates] of Object.entries(emailGroups)) {
        if (duplicates.length > 1) {
          console.log(`Found duplicates for email: ${email}`);
          // Find the verified user and unverified account
          const verifiedUser = duplicates.find(user => user.verified);
          const unverifiedUser = duplicates.find(user => !user.verified);

          if (!verifiedUser || !unverifiedUser) {
            continue; // if no verified/unverified user, skip
          }

          // Step 1: Save the original email (before modifying it to lowercase)
          const originalEmail = verifiedUser.email;

          // Step 2: Update the verified user email to lowercase
          verifiedUser.email = verifiedUser.email.toLowerCase();
          verifiedUser.originalEmail = originalEmail; // Save the original email

          // this seems redendant can we merge it with the below?
          // await db.collection('users').updateOne(
          //   { _id: verifiedUser._id },
          //   { $set: { email: verifiedUser.email } },
          //   { session }  // Include the session in the operation
          // );

          // Step 2: Merge fields from unverified user
          fieldsToMerge.forEach(field => {
            if (unverifiedUser[field] && !verifiedUser[field]) {
              verifiedUser[field] = unverifiedUser[field];
            }
          });

          // Step 3: Deactivate unverified user and update email
          const newEmail = `${unverifiedUser.email}_deactivated_${Date.now()}`;
          await db.collection('users').updateOne(
            { _id: unverifiedUser._id },
            {
              $set: {
                email: newEmail,
                originalEmail: unverifiedUser.email,
                active: false
              }
            },
            { session }  // Include the session
          );

          await db.collection('users').updateOne(
            { _id: verifiedUser._id },
            { $set: verifiedUser },
            { session }  // Include the session
          );

          updatedAccounts.push({
            verifiedUser: {
              id: verifiedUser._id,
              email: verifiedUser.email,
              originalEmail: verifiedUser.originalEmail,
              verified: verifiedUser.verified
            },
            unverifiedUser: {
              id: unverifiedUser._id,
              email: newEmail,
              originalEmail: unverifiedUser.email,
              verified: unverifiedUser.verified
            }
          });
        }
      }

      // Commit the transaction after all operations
      await session.commitTransaction();

    } catch (error) {
      console.log('Error during transaction:', error);
      // If any error occurs, abort the transaction
      await session.abortTransaction();
      throw error;
    } finally {
      // End the session
      session.endSession();
    }

    // Log final state after transaction commits
    console.log('Migration Up completed.', updatedAccounts);
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    const session = await client.startSession();
    session.startTransaction();

    console.log('Migration Down starting...');

    const updatedAccounts = [];

    try {
      // Find all deactivated users
      const deactivatedUsers = await db.collection('users').find({
        email: { $regex: '_deactivated_' },
        active: false
      }).toArray();

      const fieldsToRevert = ['team', 'gender', 'nationality', 'joinDate', 'dateOfBirth', 'originalEmail'];
      const unsetFields = fieldsToRevert.reduce((acc, field) => {
        acc[field] = undefined;  // or use undefined
        return acc;
      }, {});

      // Iterate through the deactivated users and revert changes
      for (const deactivatedAccount of deactivatedUsers) {
        const originalEmail = deactivatedAccount.email.split('_deactivated_')[0]; // Extract original email
        const verifiedUser = await db.collection('users').findOne({ email: originalEmail.toLowerCase() });

        if (!verifiedUser) {
          continue;  // If no corresponding verified user exists, skip
        }

        // Step 1: Restore the verified user's email to lowercase
        await db.collection('users').updateOne(
          { _id: verifiedUser._id },
          {
            $set:
            {
              email: verifiedUser.originalEmail
            },
            $unset: unsetFields
          },
          { session }
        );

        // Step 2: Restore the original email and reactivate the account
        await db.collection('users').updateOne(
          { _id: deactivatedAccount._id },
          {
            $set: {
              email: originalEmail, active: true
            },
            $unset: {
              originalEmail: undefined,
            }
          },
          { session }  // Include the session
        );

        updatedAccounts.push({
          verifiedUser: {
            id: verifiedUser._id,
            email: verifiedUser.originalEmail,
            verified: verifiedUser.verified
          },
          unverifiedUser: {
            id: deactivatedAccount._id,
            email: originalEmail,
            verified: deactivatedAccount.verified
          }
        });
      }

      // Commit the transaction after all operations
      await session.commitTransaction();
    } catch (error) {
      // If any error occurs, abort the transaction
      await session.abortTransaction();
      throw error;
    } finally {
      // End the session
      session.endSession();
    }

    // Log final state after transaction commits
    console.log('Migration Down completed.', updatedAccounts);
  }
};