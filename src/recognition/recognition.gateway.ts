import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RecognitionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;
  private readonly logger = new Logger(RecognitionGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  notifyClients() {
    console.log('New recognition posted! Please refresh your page.');
    if (this.server) {
      this.server.emit('recognition-created', {
        message: 'New recognition posted! Please refresh your page.',
      });
    }
  }

  @SubscribeMessage('send-recognition')
  handleMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    console.log(data);

    this.server.emit('send-recognition', { content: data });
    this.notifyClients();

    if (!data || !data.recognition) {
      client.emit('error', 'Invalid recognition data');
      return;
    }
  }

  afterInit(server: Server) {
    this.server = server;
  }
}
