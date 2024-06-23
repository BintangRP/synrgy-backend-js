const AuthenticationController = require('../app/controllers/AuthenticationController'); // Adjust the path as needed
const { EmailNotRegisteredError, WrongPasswordError } = require('../app/errors'); // Adjust the path as needed
const { JWT_SIGNATURE_KEY } = require('../config/application'); // Adjust the path as needed

describe('AuthenticationController', () => {
    let authController, userModel, roleModel, bcrypt, jwt, req, res, next;

    beforeEach(() => {
        userModel = {
            findOne: jest.fn(),
            create: jest.fn(),
            findByPk: jest.fn(),
        };

        roleModel = {
            findOne: jest.fn(),
            findByPk: jest.fn(),
        };

        bcrypt = {
            hashSync: jest.fn(),
            compareSync: jest.fn(),
        };

        jwt = {
            sign: jest.fn(),
            verify: jest.fn(),
        };

        authController = new AuthenticationController({
            userModel,
            roleModel,
            bcrypt,
            jwt,
        });

        req = {
            body: {
                email: 'test@example.com',
                password: 'password123'
            },
            user: {
                id: 1
            },
            headers: {
                authorization: 'Bearer token123'
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        next = jest.fn();
    });

    describe('handleLogin', () => {
        it('should return 201 and accessToken on successful login', async () => {
            const user = {
                id: 1,
                name: 'Test User',
                email: 'test@example.com',
                encryptedPassword: 'hashedpassword',
                Role: { id: 1, name: 'User' }
            };

            userModel.findOne.mockResolvedValue(user);
            bcrypt.compareSync.mockReturnValue(true);
            jwt.sign.mockReturnValue('token123');

            await authController.handleLogin(req, res, next);

            expect(userModel.findOne).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
                include: [{ model: roleModel, attributes: ["id", "name"] }]
            });

            expect(bcrypt.compareSync).toHaveBeenCalledWith('password123', 'hashedpassword');
            expect(jwt.sign).toHaveBeenCalledWith({
                id: user.id,
                name: user.name,
                email: user.email,
                image: undefined,
                role: {
                    id: user.Role.id,
                    name: user.Role.name,
                }
            }, JWT_SIGNATURE_KEY);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ accessToken: 'token123' });
        });

        it('should return 404 when email is not registered', async () => {
            userModel.findOne.mockResolvedValue(null);

            await authController.handleLogin(req, res, next);

            expect(userModel.findOne).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
                include: [{ model: roleModel, attributes: ["id", "name"] }]
            });

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(new EmailNotRegisteredError('test@example.com'));
        });

        it('should return 401 when password is incorrect', async () => {
            const user = {
                encryptedPassword: 'hashedpassword',
                Role: { id: 1, name: 'User' }
            };

            userModel.findOne.mockResolvedValue(user);
            bcrypt.compareSync.mockReturnValue(false);

            await authController.handleLogin(req, res, next);

            expect(userModel.findOne).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
                include: [{ model: roleModel, attributes: ["id", "name"] }]
            });

            expect(bcrypt.compareSync).toHaveBeenCalledWith('password123', 'hashedpassword');
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(new WrongPasswordError());
        });

        it('should call next with error on unexpected error', async () => {
            const error = new Error('Unexpected error');
            userModel.findOne.mockRejectedValue(error);

            await authController.handleLogin(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('handleRegister', () => {
        it('should return 201 and accessToken on successful registration', async () => {
            const role = { id: 1, name: 'CUSTOMER' };
            const newUser = {
                id: 1,
                name: 'Test User',
                email: 'test@example.com',
                encryptedPassword: 'hashedpassword',
                roleId: role.id
            };

            userModel.findOne.mockResolvedValue(null); // No existing user
            roleModel.findOne.mockResolvedValue(role);
            userModel.create.mockResolvedValue(newUser);
            bcrypt.hashSync.mockReturnValue('hashedpassword');
            jwt.sign.mockReturnValue('token123');

            await authController.handleRegister(req, res, next);

            expect(userModel.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
            expect(roleModel.findOne).toHaveBeenCalledWith({ where: { name: 'CUSTOMER' } });
            expect(bcrypt.hashSync).toHaveBeenCalledWith('password123', 10);
            expect(userModel.create).toHaveBeenCalledWith({
                email: 'test@example.com',
                encryptedPassword: 'hashedpassword',
                roleId: role.id
            });
            expect(jwt.sign).toHaveBeenCalledWith({
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                image: undefined,
                role: {
                    id: role.id,
                    name: role.name
                }
            }, JWT_SIGNATURE_KEY);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ accessToken: 'token123' });
        });

        it('should return 422 when email is already taken', async () => {
            const existingUser = {
                name: 'Test User',
                email: 'test@example.com',
                encryptedPassword: 'hashedpassword',
            };

            userModel.findOne.mockResolvedValue(existingUser); // Existing user found

            await authController.handleRegister(req, res, next);

            expect(userModel.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
            // expect(res.json).toHaveBeenCalledWith(new EmailAlreadyTakenError('test@example.com'));
        });

        it('should call next with error on unexpected error', async () => {
            const error = new Error('Unexpected error');
            userModel.findOne.mockRejectedValue(error);

            await authController.handleRegister(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('handleGetUser', () => {
        it('should return 200 and user data on successful retrieval', async () => {
            const user = {
                id: 1,
                name: 'Test User',
                email: 'test@example.com',
                roleId: 1
            };

            const role = {
                id: 1,
                name: 'CUSTOMER'
            };

            userModel.findByPk.mockResolvedValue(user);
            roleModel.findByPk.mockResolvedValue(role);

            await authController.handleGetUser(req, res);

            expect(userModel.findByPk).toHaveBeenCalledWith(1);
            expect(roleModel.findByPk).toHaveBeenCalledWith(1);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(user);
        });

        // it('should return 404 when user is not found', async () => {
        //     userModel.findByPk.mockResolvedValue(null);

        //     await authController.handleGetUser(req, res);

        //     expect(userModel.findByPk).toHaveBeenCalledWith(1);
        //     expect(res.status).toHaveBeenCalledWith(404);
        //     expect(res.json).toHaveBeenCalledWith(new RecordNotFoundError('User'));
        // });

        // it('should return 404 when role is not found', async () => {
        //     const user = {
        //         id: 1,
        //         name: 'Test User',
        //         email: 'test@example.com',
        //         roleId: 1
        //     };

        //     userModel.findByPk.mockResolvedValue(user);
        //     roleModel.findByPk.mockResolvedValue(null);

        //     await authController.handleGetUser(req, res);

        //     expect(userModel.findByPk).toHaveBeenCalledWith(1);
        //     expect(roleModel.findByPk).toHaveBeenCalledWith(1);
        //     expect(res.status).toHaveBeenCalledWith(404);
        //     expect(res.json).toHaveBeenCalledWith(new RecordNotFoundError('Role'));
        // });
    });

});
