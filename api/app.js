const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const { mongoose } = require("./db/mongoose");
const { List, Task, User } = require("./db/models");

const bodyParser = require("body-parser");

/* Middleware */

//preveri ali ima request dovoljen JWT token
let authenticate = (req, res, next) => {
  let token = req.header('x-access-token');
  jwt.verify(token, User.getJWTSecret(), (err, decoded) => {
      if (err) {
          res.status(401).send(err);
      } else {
          req.user_id = decoded._id;
          next();
      }
  });
}

//Verify refresh token middleware - preveri session
let verifySession = (req, res, next) => {
  let refreshToken = req.header("x-refresh-token");

  let _id = req.header("_id");

  User.findByIdAndToken(_id, refreshToken)
    .then((user) => {
      if (!user) {
        return Promise.reject({
          error:
            "Uporabnika ni bilo mogoče najti. Preveri da sta user id in refresh token prava",
        });
      }

      req.user_id = user._id;
      req.userObject = user;
      req.refreshToken = refreshToken;

      let isSessionValid = false;

      user.sessions.forEach((session) => {
        if (session.token === refreshToken) {
          if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
            isSessionValid = true;
          }
        }
      });

      if (isSessionValid) {
        next();
      } else {
        return Promise.reject({
          error: "Refresh token has expired or the session is invalid",
        });
      }
    })
    .catch((e) => {
      res.status(401).send(e);
    });
};

//Naloži middleware
app.use(bodyParser.json());

//CORS
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-access-token, x-refresh-token, _id"
  );

  res.header(
    "Access-Control-Expose-Headers",
    "x-access-token, x-refresh-token"
  );
  next();
});

//Naloži mongoose modele
/* Route Handlers */

/* List Handlers */

/**
 * GET /lists
 * Pridobi vse sezname
 */
app.get("/lists", authenticate, (req, res) => {
  //Hočemo da vrne array vseh seznamov v bazi, ki pripadajo uporabniku, ki je avtentificiran
  List.find({
    _userId: req.user_id,
  }).then((lists) => {
    res.send(lists);
  });
});
/* 
POST /lists 
Naredi seznam
*/
app.post("/lists", authenticate, (req, res) => {
  //Hočemo da naredi nov seznam in vrne nazaj seznam vseh listov z njihovimi IDi
  //Informacije seznamov bodo prensene preko JSON telesa
  let title = req.body.title;

  let newList = new List({
    title,
    _userId: req.user_id,
  });
  newList.save().then((listDoc) => {
    //cel list dokument je vrnjen
    res.send(listDoc);
  });
});

/*
PATCH /lists:id
Posodibmo izbran seznam
*/
app.patch("/lists/:id", authenticate, (req, res) => {
  //Hočemo da posodobimo izbran seznam z novimi podatki, ki so v JSON telesu requesta
  List.findOneAndUpdate(
    { _id: req.params.id, _userId: req.user_id },
    {
      $set: req.body,
    }
  ).then(() => {
    res.send({ message: "Uspešno posodobljeno" });
  });
});
/* 
DELTE /lists :id
Izbriše seznam
*/
app.delete("/lists/:id", authenticate, (req, res) => {
  //Hočemo da izbriše izbrani seznam
  List.findOneAndRemove({
    _id: req.params.id,
    _userId: req.user_id,
  }).then((removedListDoc) => {
    res.send(removedListDoc);

    //izbrišie vsa opravila, ki so v zbrisanem seznamu
    deleteTasksFromList(removedListDoc._id);
  });
});
/*
GET /lists/:listId/tasks
Vrni vsa opravila, ki pripadajo nekemu seznamu
*/
app.get("/lists/:listId/tasks", authenticate, (req, res) => {
  //Vrni vsa opravila, ki pripadajo nekemu seznamu
  Task.find({
    _listId: req.params.listId,
  }).then((tasks) => {
    res.send(tasks);
  });
});
app.get("/lists/:listId/tasks/:taskId", (req, res) => {
  Task.findOne({
    _id: req.params.taskId,
    _listId: req.params.listId,
  }).then((task) => {
    res.send(task);
  });
});

/*
POST /lists/:listId/tasks
    //Novo opravilo naredimo v določenem seznamu
*/
app.post("/lists/:listId/tasks", authenticate, (req, res) => {
  //Novo opravilo naredimo v določenem seznamu
  List.findOne({
    _id: req.params.listId,
    _userId: req.user_id,
  })
    .then((list) => {
      if (list) {
        //že avtentificiran user lahko naredi novo opravilo
        return true;
      } else {
        return false;
      }
    })
    .then((canCreateTask) => {
      if (canCreateTask) {
        let newTask = new Task({
          title: req.body.title,
          _listId: req.params.listId,
        });
        newTask.save().then((newTaskDocument) => {
          res.send(newTaskDocument);
        });
      } else {
        res.sendStatus(404);
      }
    });
});
/*
PATCH /lists/:listId/tasks/:taskId
    //Posodibmo opravilo v določenem seznamu
*/
app.patch("/lists/:listId/tasks/:taskId", authenticate, (req, res) => {
  // We want to update an existing task (specified by taskId)

  List.findOne({
    _id: req.params.listId,
    _userId: req.user_id,
  })
    .then((list) => {
      if (list) {
        return true;
      }
      return false;
    })
    .then((canUpdateTasks) => {
      if (canUpdateTasks) {
        Task.findOneAndUpdate(
          {
            _id: req.params.taskId,
            _listId: req.params.listId,
          },
          {
            $set: req.body,
          }
        ).then(() => {
          res.send({ message: "Uspešno posodobljeno." });
        });
      } else {
        res.sendStatus(404);
      }
    });
});
/*
DELETE /lists/:listId/tasks/:taskId
    //Izbrišemo opravilo v določenem seznamu
*/
app.delete("/lists/:listId/tasks/:taskId", authenticate, (req, res) => {
  List.findOne({
    _id: req.params.listId,
    _userId: req.user_id,
  })
    .then((list) => {
      if (list) {
        // seznam je bil najden
        // uporabnik lahko zbriše opravilo
        return true;
      }
      return false;
    })
    .then((canDeleteTasks) => {
      if (canDeleteTasks) {
        Task.findOneAndRemove({
          _id: req.params.taskId,
          _listId: req.params.listId,
        }).then((removedTaskDoc) => {
          res.send(removedTaskDoc);
        });
      } else {
        res.sendStatus(404);
      }
    });
});

/*USER ROUTES */
/*
/POST /users
Sign up uporabnikov
*/
app.post("/users", (req, res) => {
  let body = req.body;
  let newUser = new User(body);

  newUser
    .save()
    .then(() => {
      return newUser.createSession();
    })
    .then((refreshToken) => {
      // Session uspešno ustvarjen vrnemo refresh token
      // Zdaj generiramo auth token za uporabnika

      return newUser.generateAccessAuthToken().then((accessToken) => {
        return { accessToken, refreshToken };
      });
    })
    .then((authTokens) => {
      res
        .header("x-refresh-token", authTokens.refreshToken)
        .header("x-access-token", authTokens.accessToken)
        .send(newUser);
    })
    .catch((e) => {
      res.status(400).send(e);
    });
});
//login
app.post("/users/login", (req, res) => {
  let email = req.body.email;
  let password = req.body.password;

  User.findByCredentials(email, password)
    .then((user) => {
      return user
        .createSession()
        .then((refreshToken) => {
          // Session ustvarjen uspešno.
          // generiramo acces auth token za uporabnika

          return user.generateAccessAuthToken().then((accessToken) => {
            // uspešno generirano
            return { accessToken, refreshToken };
          });
        })
        .then((authTokens) => {
          res
            .header("x-refresh-token", authTokens.refreshToken)
            .header("x-access-token", authTokens.accessToken)
            .send(user);
        });
    })
    .catch((e) => {
      res.status(400).send(e);
    });
});
//Generiramo access token
app.get("/users/me/access-token", verifySession, (req, res) => {
  //vemo da je user/caller avtentificiran in imamo user_id ter userObject na voljo
  req.userObject
    .generateAccessAuthToken()
    .then((accessToken) => {
      res.header("x-access-token", accessToken).send({ accessToken });
    })
    .catch((e) => {
      res.status(400).send(e);
    });
});

app.listen(3000, () => {
  console.log("Server deluje na strenžniku 3000");
});

/* HELPER METODE */

let deleteTasksFromList = (_listId) => {
  Task.deleteMany({
    _listId,
  }).then(() => {
    console.log("Opravila iz tega seznama so zbirsana: " + _listId);
  });
};
