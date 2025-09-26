export class FirebaseStorage {
    // Since Firebase handles auth and data on client side,
    // these methods return mock data or throw errors
    async getUser(id) {
        // Firebase handles this on client side
        throw new Error("User data is managed by Firebase on client side");
    }
    async upsertUser(userData) {
        // Firebase handles this on client side
        throw new Error("User data is managed by Firebase on client side");
    }
    async getUserByEmail(email) {
        // Firebase handles this on client side
        throw new Error("User data is managed by Firebase on client side");
    }
    async createUser(userData) {
        // Firebase handles this on client side
        throw new Error("User data is managed by Firebase on client side");
    }
    async updateUser(id, updates) {
        // Firebase handles this on client side
        throw new Error("User data is managed by Firebase on client side");
    }
}
export const storage = new FirebaseStorage();
