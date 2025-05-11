import { Controller, Post, Get, Body, Query, Res } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private whatsappService: WhatsappService) {}

  @Get('webhook')
  verifyWebhook(@Query() query, @Res() res) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode && token === process.env.META_WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send('Forbidden');
    }
  }

  @Post('webhook')
  async receiveMessage(@Body() body) {
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (message) {
      const phoneNumber = message.from;
      const text = message.text?.body;
      await this.whatsappService.processMessage(phoneNumber, text);
      return { status: 'success' };
    }

    return { status: 'no_message' };
  }
}
