import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RecognitionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private server: Server;

  // Called when a user connects
  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  // Called when a user disconnects
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Broadcast a message to all connected clients
  notifyClients() {
    this.server.emit('recognition-created', {
      message: 'New recognition posted! Please refresh your page.',
    });
  }

  @SubscribeMessage('send-recognition') // This can be used to listen for client requests, if needed
  handleMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    console.log(data);
  }

  // You can inject the server object in the after initialization method
  afterInit(server: Server) {
    this.server = server;
  }
}
