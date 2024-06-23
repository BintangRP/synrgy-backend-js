const CarController = require('../app/controllers/CarController'); // Adjust the path as needed
const { Op } = require("sequelize");

describe('CarController', () => {
    let carController, carModel, userCarModel, dayjs, req, res, next;

    beforeEach(() => {
        carModel = {
            findAll: jest.fn(),
            count: jest.fn(),
            findByPk: jest.fn(),
            create: jest.fn(),
            destroy: jest.fn(),
        };

        userCarModel = {
            findOne: jest.fn(),
            create: jest.fn(),
        };

        dayjs = jest.fn();

        carController = new CarController({
            carModel,
            userCarModel,
            dayjs,
        });

        req = {
            query: {},
            params: {},
            body: {},
            user: { id: 1 },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            end: jest.fn(),
        };

        next = jest.fn();
    });

    describe('handleListCars', () => {
        it('should return a list of cars with pagination meta', async () => {
            const cars = [{ id: 1, name: 'Car 1' }];
            const carCount = 1;

            carModel.findAll.mockResolvedValue(cars);
            carModel.count.mockResolvedValue(carCount);

            await carController.handleListCars(req, res);

            expect(carModel.findAll).toHaveBeenCalled();
            expect(carModel.count).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                cars,
                meta: {
                    pagination: expect.any(Object),
                }
            });
        });

        // Additional test cases for different query parameters can be added here
    });

    describe('handleGetCar', () => {
        it('should return car details', async () => {
            const car = { id: 1, name: 'Car 1' };

            carModel.findByPk.mockResolvedValue(car);
            req.params.id = 1;

            await carController.handleGetCar(req, res);

            expect(carModel.findByPk).toHaveBeenCalledWith(1);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(car);
        });

        it('should return 404 if car is not found', async () => {
            carModel.findByPk.mockResolvedValue(null);
            req.params.id = 1;

            await carController.handleGetCar(req, res);

            expect(carModel.findByPk).toHaveBeenCalledWith(1);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.any(Object));
        });
    });

    describe('handleCreateCar', () => {
        it('should create a new car and return it', async () => {
            const car = { id: 1, name: 'Car 1', price: 100, size: 'small', image: 'image.png', isCurrentlyRented: false };

            carModel.create.mockResolvedValue(car);
            req.body = { name: 'Car 1', price: 100, size: 'small', image: 'image.png' };

            await carController.handleCreateCar(req, res);

            expect(carModel.create).toHaveBeenCalledWith({
                name: 'Car 1',
                price: 100,
                size: 'small',
                image: 'image.png',
                isCurrentlyRented: false,
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(car);
        });

        it('should return 422 if car creation fails', async () => {
            const error = new Error('Validation error');
            carModel.create.mockRejectedValue(error);
            req.body = { name: 'Car 1', price: 100, size: 'small', image: 'image.png' };

            await carController.handleCreateCar(req, res);

            expect(carModel.create).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(422);
            expect(res.json).toHaveBeenCalledWith({
                error: {
                    name: 'Error',
                    message: 'Validation error',
                }
            });
        });
    });

});
