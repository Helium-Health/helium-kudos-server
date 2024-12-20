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
    origin: [
      '*',
      // 'http://localhost:3000',
      // 'https://kudos-staging.onemedtest.com',
    ],
  },
  namespace: '/api/recognition',
})
export class RecognitionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;
  private Client: Socket;
  private readonly logger = new Logger(RecognitionGateway.name);

  handleConnection(client: Socket) {
    this.Client = client;
    this.logger.log(`Client connected: ${this.Client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  notifyClients(data: any) {
    try {
      if (this.Client && this.server) {
        this.Client.broadcast.emit('recognition-created', {
          message: 'New recognition posted! Please refresh your page.',
          data,
        });
      } else {
        this.logger.warn('Server instance or client is not initialized.');
      }
    } catch (error) {
      this.logger.error('Error notifying clients', error);
    }
  }

  @SubscribeMessage('kudos-connected')
  handleMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log('Acknowleding Client Connection');
    // Emit an acknowledgment
    client.emit('response', {
      message: 'Web Socket Connection Successful',
    });
  }
}
