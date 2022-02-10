import { Component, OnInit } from '@angular/core';
import { TaskService } from 'src/app/task.service';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Task } from 'src/app/models/task.model';
import { List } from 'src/app/models/list.model';
@Component({
  selector: 'app-task-view',
  templateUrl: './task-view.component.html',
  styleUrls: ['./task-view.component.scss']
})
export class TaskViewComponent implements OnInit {

  lists: List[] | undefined;
  tasks: Task[] | undefined;
  selectedListId: any;


  constructor(private taskService: TaskService, private route: ActivatedRoute, private router: Router) { }

  ngOnInit() {
    this.route.params.subscribe(
      (params: Params) => {
        if (params['listId']) {
          this.selectedListId = params['listId'];
          this.taskService.getTasks(params['listId']).subscribe((tasks: any) => {
            this.tasks = tasks;
          })
        } else {
          this.tasks = undefined;
        }
      }
    )

    this.taskService.getLists().subscribe((lists: any) => {
      this.lists = lists;
    })
  }
  onTaskClick(task: Task) {
    // Hočemo nastaviti, da je opravilo opravljeno
    this.taskService.complete(task).subscribe(() => {
      // Opravilo je bilo opravljeno!
      console.log("completed!");
      task.completed = !task.completed;
    })
  }
  onDeleteListClick(){
    this.taskService.deleteList(this.selectedListId).subscribe((res: any) =>{
      this.router.navigate(['/lists']);
      console.log(res);
    })
  }
  onTaskDeleteClick(id: string){
    this.taskService.deleteTask(this.selectedListId, id).subscribe((res: any) =>{
      this.tasks?.filter(val => val._id !== id);
      this.router.navigate([`/lists/`]);
      console.log(res);
    })
  }
}