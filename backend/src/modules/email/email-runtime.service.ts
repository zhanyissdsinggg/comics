import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common";
import { EmailService } from "./email.service";

@Injectable()
export class EmailRuntimeService implements OnApplicationBootstrap, OnApplicationShutdown {
  constructor(private readonly emailService: EmailService) {}

  onApplicationBootstrap(): void {
    this.emailService.startRetryLoop();
  }

  onApplicationShutdown(): void {
    this.emailService.stopRetryLoop();
  }
}
