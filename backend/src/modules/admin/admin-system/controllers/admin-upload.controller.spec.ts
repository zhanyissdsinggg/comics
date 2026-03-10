import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminUploadController } from './admin-upload.controller';

describe('AdminUploadController', () => {
  let controller: AdminUploadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUploadController],
      providers: [
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('token'),
            verify: jest.fn().mockReturnValue({ sub: 'admin', role: 'admin' }),
          },
        },
      ],
    }).compile();

    controller = module.get<AdminUploadController>(AdminUploadController);
  });

  it('returns an absolute public asset url for uploaded images', async () => {
    const result = await controller.uploadImage(
      {
        filename: 'cover.png',
        originalname: 'cover.png',
        size: 1234,
      },
      {
        protocol: 'https',
        headers: {
          host: 'api.example.com',
          'x-forwarded-proto': 'https',
        },
        get: (name: string) => (name === 'host' ? 'api.example.com' : ''),
      } as never,
    );

    expect(result.url).toBe('https://api.example.com/uploads/cover.png');
  });
});
