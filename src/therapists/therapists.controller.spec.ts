import { Test, TestingModule } from '@nestjs/testing';
import { TherapistsController } from './therapists.controller';

describe('TherapistsController', () => {
  let controller: TherapistsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TherapistsController],
    }).compile();

    controller = module.get<TherapistsController>(TherapistsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
