import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Task } from './models/task.model';
import { WebRequestService } from './web-request.service';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  constructor(private webReqService: WebRequestService, private http:HttpClient) { }

  createList(title: string){
    //Pošljemo WEB request da naredimo seznam
    return this.webReqService.post('lists', {title});
  }
  updateList(id: string, title: string){
    //Pošljemo WEB request da naredimo seznam
    return this.webReqService.patch(`lists/${id}`, {title});
  }
  updateTask(listId: string, taskId: string, title: string) {
    return this.webReqService.patch(`lists/${listId}/tasks/${taskId}`, { title });
  }
  getLists() {
    return this.webReqService.get('lists');
  }
  getTasks(listId: string) {
    return this.webReqService.get(`lists/${listId}/tasks`);
  }
  createTask(title: string, listId: string){
    //Pošljemo WEB request da naredimo seznam
    return this.webReqService.post(`lists/${listId}/tasks`, {title});
  }
  complete(task: Task) {
    return this.webReqService.patch(`lists/${task._listId}/tasks/${task._id}`, {
      completed: !task.completed
    });
  }
  deleteList(id: string){
    return this.webReqService.delete(`lists/${id}`);
  }
  deleteTask(listId: string, taskId: string){
    return this.webReqService.delete(`lists/${listId}/tasks/${taskId}`);
  }
}
