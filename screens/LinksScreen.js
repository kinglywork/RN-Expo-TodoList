import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Switch,
  FlatList,
  Button,
  Picker,
  TouchableOpacity,
} from 'react-native';
import Expo, { SQLite } from 'expo';
import { MaterialIcons } from '@expo/vector-icons';

class TodoDac {
  constructor(db){
    if(db){
      this.db = db;
    } else {
      this.db = SQLite.openDatabase({ name: 'db.db' });
    }
  }

  createTable(){
    this.db.transaction(tx => {
      tx.executeSql('create table if not exists items (id integer primary key not null, content text, complete int, timeStamp int);');
    });
  }

  dropTable(){
    this.db.transaction(tx => {
      tx.executeSql('drop table items;');
    });
  }

  getAll(successCB){
    this.db.transaction(tx => {
      tx.executeSql(
          'select * from items',
          null,
          (_, { rows: { _array } }) => {
            successCB(_array.map(item => {
              return {...item, key: item.id, complete: item.complete === 1};
            }));
          }
        );
    });
  }

  getNewId(successCB){
    this.db.transaction(tx => {
      tx.executeSql(
          'select count(1) + 1 as key from items',
          null,
          (_, { rows: { _array } }) => {
            successCB(_array[0].key);
          }
        );
    });
  }

  insert(item, successCB){
    this.db.transaction(tx => {
      tx.executeSql(
          'insert into items(id, content, complete, timeStamp) values(?, ?, ?, ?)',
          [item.key, item.content, item.complete ? 1 : 0, item.timeStamp],
          successCB
        );
    });
  }

  update(item, successCB){
    this.db.transaction(tx => {
      tx.executeSql(
        'update items set complete=? where id=?',
        [item.complete ? 1 : 0, item.key],
        successCB
      );
    });
  }

  delete(item, successCB){
    this.db.transaction(tx => {
      tx.executeSql(
        'delete from items where id=?',
        [item.key],
        successCB
      );
    });
  }
}

class TodoItem extends React.Component {
  render() {
    const { item, onCompleteChange, onDelete } = this.props;

    return (
      <View style={{flex: 1, flexDirection: 'row', padding: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <Switch
          value={item.complete}
          onValueChange={(newValue) => {
            if (onCompleteChange) {
              onCompleteChange(newValue);
            }
          }}
        />
        <Text style={[item.complete && { textDecorationLine: 'line-through' }, {fontSize: 20, flex: 1, paddingHorizontal: 10}]}>{item.content}</Text>
        <TouchableOpacity
          onPress={() => {
            if(onDelete){
              onDelete(item);
            }
          }}
        >
          <View >
            <MaterialIcons name="delete" size={24} color="lightblue" />
          </View>
        </TouchableOpacity>        
      </View>
    );
  }
}

class TodoListContainer extends React.Component {
  constructor(props) {
    super(props);

    this.dac = new TodoDac();
    // this.dac.dropTable();
    this.dac.createTable();   

    this.handleAdd = this.handleAdd.bind(this);
    this.handleCompleteChange = this.handleCompleteChange.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
    this.handleItemDelete = this.handleItemDelete.bind(this);

    this.state = {
      newItem: '',
      filter: 'all',
      items: [],
    };
  }

  static navigationOptions = {
    title: 'todo list',
  };

  handleAdd() {
    if (!this.state.newItem) {
      return;
    }
    this.dac.getNewId((key) => {
      const item = { 
        key, 
        content: this.state.newItem, 
        complete: false, 
        timeStamp: Date.now() 
      };
      this.dac.insert(item, () => {
        this.setState({
          newItem: '',
          items: [
            ...this.state.items,
            item
          ]
        });
      });
    });        
  }

  handleCompleteChange(item, complete) {
    const itemToUpdate = { ...item, complete: complete };
    this.dac.update(itemToUpdate, () => {
      this.setState({
        items: [
          ...this.state.items.filter(i => i.key !== item.key),
          itemToUpdate
        ]
      });
    });    
  }

  handleItemDelete(item){
    this.dac.delete(item, () => {
      this.setState({items: this.state.items.filter(i => i.key !== item.key)});
    });
  }

  handleFilterChange(filter) {
    this.setState({ filter });
  }

  getFilter(filter) {
    return (item) => {
      switch (filter) {
        case 'all': {
          return true;
        }
        case 'uncomplete': {
          return !item.complete;
        }
        case 'complete': {
          return item.complete;
        }
        default: {
          return true;
        }
      }
    }
  }

  componentDidMount(){ 
    this.dac.getAll((items) => {
      this.setState({items});
    });
  }

  render() {
    const sortedItems = this.state.items
      .filter(this.getFilter(this.state.filter))
      .sort((a, b) => b.timeStamp - a.timeStamp);
    return (
      <View style={styles.container}>
        <TextInput
          value={this.state.newItem}
          onChangeText={(text) => this.setState({ newItem: text })}
        />
        <Button
          title="Add"
          onPress={this.handleAdd}
        />
        <Picker
          selectedValue={this.state.filter}
          onValueChange={this.handleFilterChange}
        >
          <Picker.Item label="Uncomplete" value="uncomplete" />
          <Picker.Item label="Complete" value="complete" />
          <Picker.Item label="All" value="all" />
        </Picker>
        <FlatList
          data={sortedItems}
          renderItem={({ item }) => {
            return (
              <TodoItem
                item={item}
                onCompleteChange={(complete) => {
                  this.handleCompleteChange(item, complete);
                }}
                onDelete={this.handleItemDelete}
              />
            );
          }}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
});

export default TodoListContainer;
