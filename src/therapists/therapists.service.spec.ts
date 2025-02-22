import { Test, TestingModule } from '@nestjs/testing';
import { TherapistsService } from './therapists.service';

describe('TherapistsService', () => {
  let service: TherapistsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TherapistsService],
    }).compile();

    service = module.get<TherapistsService>(TherapistsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
