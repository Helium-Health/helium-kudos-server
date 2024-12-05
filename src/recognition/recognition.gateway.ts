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

  private readonly logger = new Logger(RecognitionGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  notifyClients(data: any) {
    try {
      if (this.server) {
        this.logger.log('Notifying clients with new recognition data.', data);
        this.server.emit('recognition-created', {
          message: 'New recognition posted! Please refresh your page.',
          data,
        });
      } else {
        this.logger.warn('Server instance is not initialized.');
      }
    } catch (error) {
      this.logger.error('Error notifying clients', error);
    }
  }

  @SubscribeMessage('kudos-connected')
  handleMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log('Broadcasting new recognition data.');
    // Emit an acknowledgment
    client.emit('response', {
      message: 'Web Socket Connection Successful',
    });
  }
}
